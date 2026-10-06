import { join } from "node:path";
import type { AnalysisReport, AnalyzeRequest, ToolCategory } from "../domain/model.ts";
import {
  addToolEvent,
  buildReport,
  commandCounts,
  completeToolEvent,
  emptySession,
  fileEventsFromPaths,
  patchFileEvents,
  pathFields,
  projectMatches,
  visitedUrls,
} from "../domain/normalization.ts";
import { shellReadEvents } from "../domain/shell-reads.ts";
import { findFiles, jsonLines, modifiedAt } from "../infrastructure/files.ts";
import { asRecord, asString, isRecord } from "../shared/unknown.ts";

const nestedTool = /\btools\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(/g;

function category(name: string): ToolCategory {
  const lowered = name.toLowerCase();
  if (lowered.startsWith("mcp__")) return "mcp";
  if (lowered.includes("exec") || lowered.includes("command") || lowered.includes("stdin") || lowered.includes("terminal")) return "shell";
  if (lowered.includes("patch") || lowered.includes("edit") || ["write", "delete"].includes(lowered)) return "file_edit";
  if (lowered.includes("read") || lowered.includes("view_image")) return "file_read";
  if (lowered.includes("search") || lowered.includes("find")) return "search";
  if (lowered.includes("browser")) return "browser";
  if (lowered.includes("web")) return "web";
  if (lowered.includes("collaboration") || lowered.includes("agent") || lowered.includes("thread")) return "subagent";
  if (lowered.includes("plan") || lowered.includes("goal")) return "planning";
  return "other";
}

function toolText(payload: Record<string, unknown>): string {
  const raw = payload.input ?? payload.arguments ?? "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

function toolNames(payload: Record<string, unknown>, text: string): string[] {
  const name = asString(payload.name) ?? "unknown";
  const namespace = asString(payload.namespace);
  const outer = namespace ? `${namespace}.${name}` : name;
  if (outer !== "exec") return [outer];
  const nested = [...text.matchAll(nestedTool)].flatMap((match) => match[1] ? [match[1]] : []);
  return nested.length > 0 ? nested : [outer];
}

interface SessionHeader {
  sessionId: string;
  cwd: string | null;
}

async function readHeader(source: string): Promise<SessionHeader> {
  let sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
  let cwd: string | null = null;
  let hasCanonicalId = false;
  let inspected = 0;
  for await (const raw of jsonLines(source)) {
    if (inspected >= 30) break;
    inspected += 1;
    if (!isRecord(raw)) continue;
    const payload = asRecord(raw.payload);
    if (raw.type === "session_meta") {
      sessionId = asString(payload.id) ?? asString(payload.session_id) ?? sessionId;
      hasCanonicalId = asString(payload.id) !== null || asString(payload.session_id) !== null;
      cwd = asString(payload.cwd) ?? cwd;
    } else if (raw.type === "turn_context") {
      cwd = asString(payload.cwd) ?? cwd;
    }
    if (cwd && hasCanonicalId) break;
  }
  return { sessionId, cwd };
}

async function inspectSession(source: string) {
  const stem = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
  const session = emptySession("codex", stem, source);
  const callNames = new Map<string, string>();
  session.tokenCalls = [];
  let currentModel: string | null = null;
  let previousTotal: number | null = null;
  let lastUsage: Record<string, unknown> | null = null;
  let invalidLines = 0;
  let responseMessages = 0;
  let messageIndex = -1;
  let hasSessionMetadata = false;
  const fallbackMessages = { user: 0, assistant: 0 };

  for await (const raw of jsonLines(source)) {
    if (!isRecord(raw)) {
      invalidLines += 1;
      continue;
    }
    const payload = asRecord(raw.payload);
    const timestamp = asString(raw.timestamp);
    if (raw.type === "session_meta") {
      if (!hasSessionMetadata) {
        session.sessionId = asString(payload.id) ?? asString(payload.session_id) ?? session.sessionId;
        session.startedAt ??= asString(payload.timestamp) ?? timestamp;
        session.projectPath ??= asString(payload.cwd);
        hasSessionMetadata = true;
      }
    } else if (raw.type === "turn_context") {
      session.projectPath ??= asString(payload.cwd);
      const model = asString(payload.model);
      if (model) session.models.push(model);
      currentModel = model;
    } else if (raw.type === "response_item") {
      const itemType = asString(payload.type);
      if (itemType === "message") {
        const role = asString(payload.role);
        if (role === "user" || role === "assistant") {
          session.messages[role] += 1;
          responseMessages += 1;
          if (role === "user") messageIndex += 1;
        }
      } else if (itemType === "function_call" || itemType === "custom_tool_call") {
        const text = toolText(payload);
        const names = toolNames(payload, text);
        const callId = asString(payload.call_id);
        for (const name of names) {
          const toolCategory = category(name);
          addToolEvent(session, {
            name,
            category: toolCategory,
            callId,
            messageIndex: Math.max(messageIndex, 0),
            timestamp,
            files: toolCategory === "shell"
              ? shellReadEvents(text, session.projectPath)
              : toolCategory === "file_edit"
                ? name.toLowerCase().includes("patch")
                  ? patchFileEvents(text, session.projectPath)
                  : fileEventsFromPaths(pathFields(text), "edit", session.projectPath)
                : toolCategory === "file_read"
                  ? fileEventsFromPaths(pathFields(text), "read", session.projectPath)
                  : [],
            urls: toolCategory === "web" || toolCategory === "browser" ? visitedUrls(text) : [],
          });
        }
        if (callId) callNames.set(callId, names[0] ?? "unknown");
        const counts = commandCounts(text);
        session.activity.testOrCheckCalls += counts.tests;
        session.activity.gitCalls += counts.git;
      } else if (itemType === "function_call_output" || itemType === "custom_tool_call_output") {
        const callId = asString(payload.call_id);
        const output = payload.output;
        const outputRecord = asRecord(output);
        completeToolEvent(session, callId, outputRecord.isError === true || outputRecord.is_error === true);
      }
    } else if (raw.type === "event_msg") {
      const detail = asString(payload.type);
      if (detail === "task_started") session.turns = (session.turns ?? 0) + 1;
      else if (detail === "user_message") {
        fallbackMessages.user += 1;
        if (responseMessages === 0) messageIndex += 1;
      } else if (detail === "agent_message") fallbackMessages.assistant += 1;
      else if (detail === "web_search_end") session.activity.webSearches += 1;
      else if (detail === "token_count") {
        const usage = asRecord(asRecord(payload.info).total_token_usage);
        if (Object.keys(usage).length > 0) {
          const total = typeof usage.total_tokens === "number" ? usage.total_tokens : null;
          const detailUsage = asRecord(asRecord(payload.info).last_token_usage);
          if (total !== null && total !== previousTotal) {
            const reconciles = typeof detailUsage.total_tokens === "number" && total - (previousTotal ?? 0) === detailUsage.total_tokens;
            if (!reconciles) session.diagnostics.push("Uso por llamada no conciliable con el acumulado; coste parcial");
            const number = (key: string): number | null => reconciles && typeof detailUsage[key] === "number" ? detailUsage[key] : null;
            session.tokenCalls.push({
              messageIndex: Math.max(messageIndex, 0), model: currentModel, timestamp,
              values: { input: number("input_tokens"), cachedInput: number("cached_input_tokens"), cacheWriteInput: number("cache_write_input_tokens"), output: number("output_tokens"), reasoningOutput: number("reasoning_output_tokens"), total: number("total_tokens") },
            });
            previousTotal = total;
          }
          lastUsage = usage;
          const number = (key: string): number | null => typeof usage[key] === "number" ? usage[key] : null;
          session.tokenUsageByMessage.push({
            messageIndex: Math.max(messageIndex, 0),
            cumulative: true,
            values: {
              input: number("input_tokens"),
              cachedInput: number("cached_input_tokens"),
              cacheWriteInput: number("cache_write_input_tokens"),
              output: number("output_tokens"),
              reasoningOutput: number("reasoning_output_tokens"),
              total: number("total_tokens"),
            },
          });
        }
      }
    }
    if (timestamp) session.updatedAt = timestamp;
  }

  if (lastUsage) {
    const number = (key: string): number | null => typeof lastUsage?.[key] === "number" ? lastUsage[key] : null;
    session.tokens = {
      input: number("input_tokens"),
      cachedInput: number("cached_input_tokens"),
      cacheWriteInput: number("cache_write_input_tokens"),
      output: number("output_tokens"),
      reasoningOutput: number("reasoning_output_tokens"),
      total: number("total_tokens"),
    };
  }
  if (responseMessages === 0) session.messages = fallbackMessages;
  session.coverage = { messages: true, skills: true, toolCalls: true, toolResults: true, tokens: lastUsage !== null, files: true };
  if (invalidLines > 0) session.diagnostics.push(`${invalidLines} líneas JSONL inválidas`);
  return session;
}

export async function analyzeCodex(request: AnalyzeRequest): Promise<AnalysisReport> {
  const sources = [
    ...(await findFiles(join(request.home, "sessions"), ".jsonl")),
    ...(await findFiles(join(request.home, "archived_sessions"), ".jsonl")),
  ];
  const candidates = new Map<string, { source: string; modifiedAt: number }>();
  for (const source of sources) {
    const header = await readHeader(source);
    if (!projectMatches(header.cwd, request.project)) continue;
    const sourceModifiedAt = await modifiedAt(source);
    const previous = candidates.get(header.sessionId);
    if (!previous || sourceModifiedAt > previous.modifiedAt) candidates.set(header.sessionId, { source, modifiedAt: sourceModifiedAt });
  }
  const recent = [...candidates.values()].toSorted((a, b) => b.modifiedAt - a.modifiedAt).slice(0, request.limit);
  const sessions = await Promise.all(recent.map(({ source }) => inspectSession(source)));
  return buildReport("codex", request.home, request.project, request.limit, sessions, { matchedSessions: candidates.size });
}
