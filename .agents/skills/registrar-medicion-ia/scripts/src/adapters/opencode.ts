import { Database } from "bun:sqlite";
import { join } from "node:path";
import type { AnalysisReport, AnalyzeRequest, NormalizedSession, ToolCategory } from "../domain/model.ts";
import {
  addSkill,
  addToolEvent,
  buildReport,
  commandCounts,
  completeToolEvent,
  emptySession,
  fileEventsFromPaths,
  isoFromEpoch,
  isWebSearchTool,
  patchFileEvents,
  pathFields,
  projectMatches,
  visitedUrls,
} from "../domain/normalization.ts";
import { shellReadEvents } from "../domain/shell-reads.ts";
import { asNumber, asRecord, asString, parseJsonRecord } from "../shared/unknown.ts";

const builtInTools = new Set([
  "apply_patch", "bash", "edit", "glob", "grep", "list", "read", "skill", "task", "todowrite", "webfetch", "websearch", "write",
]);

function category(name: string): ToolCategory {
  const lowered = name.toLowerCase();
  if (["apply_patch", "edit", "write", "delete"].includes(lowered)) return "file_edit";
  if (["read", "readfile"].includes(lowered)) return "file_read";
  if (["bash", "shell"].includes(lowered)) return "shell";
  if (["grep", "glob", "list", "rg"].includes(lowered)) return "search";
  if (lowered.includes("browser") || lowered.includes("playwright") || lowered.includes("chrome-devtools")) return "browser";
  if (["webfetch", "websearch"].includes(lowered)) return "web";
  if (["task", "agent"].includes(lowered)) return "subagent";
  if (["todowrite", "plan"].includes(lowered)) return "planning";
  return builtInTools.has(lowered) ? "other" : "mcp";
}

function parseStoredRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") return parseJsonRecord(value) ?? {};
  return asRecord(value);
}

function queryRows(database: Database, sql: string, parameters: (string | number)[] = []): Record<string, unknown>[] {
  return database.query(sql).all(...parameters).map(asRecord);
}

function inspectSession(database: Database, row: Record<string, unknown>, source: string): NormalizedSession {
  const sessionId = asString(row.id) ?? "unknown";
  const session = emptySession("opencode", sessionId, source);
  session.projectPath = asString(row.directory);
  session.startedAt = isoFromEpoch(asNumber(row.time_created));
  session.updatedAt = isoFromEpoch(asNumber(row.time_updated));
  const model = parseStoredRecord(row.model);
  const modelId = asString(model.id);
  if (modelId) session.models.push(modelId);
  const input = asNumber(row.tokens_input) ?? 0;
  const output = asNumber(row.tokens_output) ?? 0;
  const reasoning = asNumber(row.tokens_reasoning) ?? 0;
  session.tokens = {
    input,
    cachedInput: asNumber(row.tokens_cache_read),
    cacheWriteInput: asNumber(row.tokens_cache_write),
    output,
    reasoningOutput: reasoning,
    total: input + output + reasoning,
  };
  const cost = asNumber(row.cost);
  if (cost !== null) session.cost = cost;

  let messageIndex = -1;
  const messageIndices = new Map<string, number>();
  for (const messageRow of queryRows(database, "SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created, id", [sessionId])) {
    const data = parseStoredRecord(messageRow.data);
    const role = asString(data.role);
    if (role === "user" || role === "assistant") session.messages[role] += 1;
    if (role === "user") {
      messageIndex += 1;
      session.turns = (session.turns ?? 0) + 1;
    }
    const messageId = asString(messageRow.id);
    if (messageId) messageIndices.set(messageId, Math.max(messageIndex, 0));
  }

  for (const partRow of queryRows(database, "SELECT id, message_id, time_created, data FROM part WHERE session_id = ? ORDER BY time_created, id", [sessionId])) {
    const part = parseStoredRecord(partRow.data);
    if (part.type !== "tool") continue;
    const name = asString(part.tool) ?? "unknown";
    const state = asRecord(part.state);
    const toolInput = state.input;
    const toolCategory = category(name);
    const cwd = session.projectPath;
    const files = toolCategory === "file_read"
      ? fileEventsFromPaths(pathFields(toolInput), "read", cwd)
      : toolCategory === "file_edit"
        ? [...patchFileEvents(toolInput, cwd), ...fileEventsFromPaths(pathFields(toolInput), "edit", cwd)]
        : toolCategory === "shell"
          ? shellReadEvents(toolInput, cwd)
          : [];
    const callId = asString(part.callID) ?? asString(partRow.id);
    const messageId = asString(partRow.message_id);
    const event = addToolEvent(session, {
      name,
      category: toolCategory,
      callId,
      messageIndex: messageId ? messageIndices.get(messageId) ?? 0 : 0,
      timestamp: isoFromEpoch(asNumber(partRow.time_created)),
      files,
      urls: toolCategory === "web" || toolCategory === "browser" ? visitedUrls(toolInput) : [],
    });
    if (name === "skill") {
      const inputRecord = asRecord(toolInput);
      const skill = asString(inputRecord.name) ?? asString(inputRecord.skill);
      if (skill) {
        addSkill(session, skill, "reads");
        event.skills = [...new Set([...event.skills, skill])].sort();
      }
    }
    const status = asString(state.status);
    if (status === "completed" || status === "error") completeToolEvent(session, callId, status === "error");
    const counts = commandCounts(toolInput);
    session.activity.testOrCheckCalls += counts.tests;
    session.activity.gitCalls += counts.git;
    if (toolCategory === "web" && isWebSearchTool(name)) session.activity.webSearches += 1;
  }
  session.coverage = { messages: true, skills: true, toolCalls: true, toolResults: true, tokens: true, files: true };
  return session;
}

export async function analyzeOpenCode(request: AnalyzeRequest): Promise<AnalysisReport> {
  const source = join(request.home, "opencode.db");
  if (!Bun.file(source).size) {
    return buildReport("opencode", request.home, request.project, request.limit, [], { diagnostics: ["No se encontró la base de datos de OpenCode"] });
  }
  const database = new Database(source, { readonly: true, strict: true });
  try {
    const rows = queryRows(
      database,
      "SELECT id, directory, time_created, time_updated, model, cost, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read, tokens_cache_write FROM session ORDER BY time_updated DESC",
    );
    const matched = rows.filter((row) => projectMatches(asString(row.directory), request.project));
    const sessions = matched.slice(0, request.limit).map((row) => inspectSession(database, row, source));
    return buildReport("opencode", request.home, request.project, request.limit, sessions, { matchedSessions: matched.length });
  } finally {
    database.close();
  }
}
