import { join } from "node:path";
import type { AnalysisReport, AnalyzeRequest, NormalizedSession, TokenUsage, ToolCategory } from "../domain/model.ts";
import {
  addSkill,
  addToolEvent,
  buildReport,
  commandCounts,
  completeToolEvent,
  emptySession,
  fileEventsFromPaths,
  isWebSearchTool,
  pathFields,
  projectMatches,
  patchFileEvents,
  visitedUrls,
} from "../domain/normalization.ts";
import { shellReadEvents } from "../domain/shell-reads.ts";
import { findFiles, jsonLines, modifiedAt } from "../infrastructure/files.ts";
import { asArray, asNumber, asRecord, asString, isRecord, parseJsonRecord } from "../shared/unknown.ts";

function category(name: string): ToolCategory {
  const lowered = name.toLowerCase();
  if (lowered.startsWith("mcp__")) return "mcp";
  if (["edit", "write", "notebookedit", "applypatch", "delete"].includes(lowered)) return "file_edit";
  if (["read", "readfile"].includes(lowered)) return "file_read";
  if (["bash", "shell", "awaitshell"].includes(lowered)) return "shell";
  if (["grep", "glob", "rg"].includes(lowered)) return "search";
  if (lowered.includes("browser")) return "browser";
  if (lowered.includes("web")) return "web";
  if (lowered.includes("agent") || lowered.includes("task")) return "subagent";
  if (lowered.includes("plan") || lowered.includes("todo")) return "planning";
  return "other";
}

function hasNonToolResult(content: unknown[]): boolean {
  return content.some((part) => isRecord(part) && part.type !== "tool_result");
}

async function inspectSession(source: string): Promise<NormalizedSession> {
  const stem = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
  const session = emptySession("claude-code", stem, source);
  const callNames = new Map<string, string>();
  const seenUsage = new Set<string>();
  const totals: TokenUsage = { input: 0, cachedInput: 0, cacheWriteInput: 0, output: 0, reasoningOutput: null, total: 0 };
  let hasUsage = false;
  let invalidLines = 0;
  let messageIndex = -1;

  for await (const raw of jsonLines(source)) {
    if (!isRecord(raw)) {
      invalidLines += 1;
      continue;
    }
    session.sessionId = asString(raw.sessionId) ?? session.sessionId;
    session.projectPath = asString(raw.cwd) ?? session.projectPath;
    const timestamp = asString(raw.timestamp);
    session.startedAt ??= timestamp;
    session.updatedAt = timestamp ?? session.updatedAt;
    const message = asRecord(raw.message);
    const role = asString(message.role) ?? asString(raw.type);
    if (role === "user" || role === "assistant") session.messages[role] += 1;
    const content = asArray(message.content);
    const userTurn = role === "user" && hasNonToolResult(content);
    if (userTurn) {
      messageIndex += 1;
      session.turns = (session.turns ?? 0) + 1;
    }
    const model = asString(message.model);
    if (model) session.models.push(model);
    const attribution = asString(raw.attributionSkill);
    if (attribution) addSkill(session, attribution, "attributedMessages");

    for (const rawPart of content) {
      if (!isRecord(rawPart)) continue;
      if (rawPart.type === "tool_use") {
        const name = asString(rawPart.name) ?? "unknown";
        const toolCategory = category(name);
        const input = rawPart.input;
        const callId = asString(rawPart.id);
        const files = toolCategory === "file_read"
          ? fileEventsFromPaths(pathFields(input), "read", session.projectPath)
          : toolCategory === "shell"
            ? shellReadEvents(input, session.projectPath)
            : toolCategory === "file_edit"
              ? [...patchFileEvents(input, session.projectPath), ...fileEventsFromPaths(pathFields(input), "edit", session.projectPath)]
              : [];
        addToolEvent(session, { name, category: toolCategory, callId, messageIndex: Math.max(messageIndex, 0), timestamp, files, urls: toolCategory === "web" || toolCategory === "browser" ? visitedUrls(input) : [] });
        if (callId) callNames.set(callId, name);
        const counts = commandCounts(input);
        session.activity.testOrCheckCalls += counts.tests;
        session.activity.gitCalls += counts.git;
        if (toolCategory === "web" && isWebSearchTool(name)) session.activity.webSearches += 1;
      } else if (rawPart.type === "tool_result") {
        completeToolEvent(session, asString(rawPart.tool_use_id), rawPart.is_error === true);
      }
    }

    const usage = asRecord(message.usage);
    const messageId = asString(message.id);
    if (Object.keys(usage).length > 0 && (!messageId || !seenUsage.has(messageId))) {
      if (messageId) seenUsage.add(messageId);
      hasUsage = true;
      const input = asNumber(usage.input_tokens) ?? 0;
      const cached = asNumber(usage.cache_read_input_tokens) ?? 0;
      const cacheWrite = asNumber(usage.cache_creation_input_tokens) ?? 0;
      const output = asNumber(usage.output_tokens) ?? 0;
      totals.input = (totals.input ?? 0) + input + cached + cacheWrite;
      totals.cachedInput = (totals.cachedInput ?? 0) + cached;
      totals.cacheWriteInput = (totals.cacheWriteInput ?? 0) + cacheWrite;
      totals.output = (totals.output ?? 0) + output;
      totals.total = (totals.total ?? 0) + input + cached + cacheWrite + output;
      session.tokenUsageByMessage.push({
        messageIndex: Math.max(messageIndex, 0),
        cumulative: false,
        values: { input: input + cached + cacheWrite, cachedInput: cached, cacheWriteInput: cacheWrite, output, reasoningOutput: null, total: input + cached + cacheWrite + output },
      });
    }
  }
  if (hasUsage) session.tokens = totals;
  session.coverage = { messages: true, skills: true, toolCalls: true, toolResults: true, tokens: hasUsage, files: true };
  if (invalidLines > 0) session.diagnostics.push(`${invalidLines} líneas JSONL inválidas`);
  return session;
}

async function sourceHeader(source: string): Promise<{ sessionId: string; cwd: string | null }> {
  let sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
  let cwd: string | null = null;
  let inspected = 0;
  for await (const raw of jsonLines(source)) {
    if (inspected >= 30) break;
    inspected += 1;
    if (!isRecord(raw)) continue;
    sessionId = asString(raw.sessionId) ?? sessionId;
    cwd = asString(raw.cwd) ?? cwd;
    if (cwd) break;
  }
  return { sessionId, cwd };
}

async function indexedSessions(home: string, rawIds: Set<string>, project: string | null): Promise<NormalizedSession[]> {
  const sessions: NormalizedSession[] = [];
  for (const indexPath of await findFiles(join(home, "projects"), "sessions-index.json")) {
    const index = parseJsonRecord(await Bun.file(indexPath).text());
    if (!index) continue;
    for (const rawEntry of asArray(index.entries)) {
      const entry = asRecord(rawEntry);
      const sessionId = asString(entry.sessionId);
      const projectPath = asString(entry.projectPath);
      if (!sessionId || rawIds.has(sessionId) || !projectMatches(projectPath, project)) continue;
      const session = emptySession("claude-code", sessionId, asString(entry.fullPath) ?? indexPath);
      session.startedAt = asString(entry.created);
      session.updatedAt = asString(entry.modified);
      session.projectPath = projectPath;
      session.messages.user = asNumber(entry.messageCount) ?? 0;
      session.diagnostics.push("La sesión figura en sessions-index.json, pero su JSONL ya no está disponible");
      sessions.push(session);
    }
  }
  return sessions;
}

export async function analyzeClaude(request: AnalyzeRequest): Promise<AnalysisReport> {
  const candidates: { source: string; modifiedAt: number }[] = [];
  const rawIds = new Set<string>();
  for (const source of await findFiles(join(request.home, "projects"), ".jsonl")) {
    const header = await sourceHeader(source);
    rawIds.add(header.sessionId);
    if (projectMatches(header.cwd, request.project)) candidates.push({ source, modifiedAt: await modifiedAt(source) });
  }
  const recent = candidates.toSorted((a, b) => b.modifiedAt - a.modifiedAt).slice(0, request.limit);
  const sessions = await Promise.all(recent.map(({ source }) => inspectSession(source)));
  const indexed = await indexedSessions(request.home, rawIds, request.project);
  return buildReport("claude-code", request.home, request.project, request.limit, [...sessions, ...indexed], {
    matchedSessions: candidates.length + indexed.length,
  });
}
