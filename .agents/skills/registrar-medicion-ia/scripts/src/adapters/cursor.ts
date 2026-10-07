import { Database } from "bun:sqlite";
import { dirname, join } from "node:path";
import type { AnalysisReport, AnalyzeRequest, NormalizedSession, ToolCategory } from "../domain/model.ts";
import {
  addToolEvent,
  buildReport,
  commandCounts,
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
import { findFiles, jsonLines, modifiedAt } from "../infrastructure/files.ts";
import { asArray, asNumber, asRecord, asString, isRecord, parseJsonRecord } from "../shared/unknown.ts";

import { readCursorUsage } from "./cursor-hooks.ts";
import {
  emptySessionSettings,
  extractComposerSettings,
  hasSessionSettings,
  mergeSessionSettings,
  summarizeContextUsage,
  sumCursorUsage,
} from "../domain/cursor-usage.ts";

interface CursorMetadata {
  createdAt: number | null;
  updatedAt: number | null;
  model: string | null;
  projectPath: string | null;
  linesAdded: number | null;
  linesRemoved: number | null;
  filesChangedCount: number | null;
  sessionSettings: import("../domain/cursor-usage.ts").SessionSettings;
}

function category(name: string): ToolCategory {
  const lowered = name.toLowerCase();
  if (["applypatch", "delete", "write", "edit", "notebookedit"].includes(lowered)) return "file_edit";
  if (["readfile", "read", "readlints"].includes(lowered)) return "file_read";
  if (["shell", "awaitshell"].includes(lowered)) return "shell";
  if (["rg", "glob", "grep", "codesearch"].includes(lowered)) return "search";
  if (lowered.includes("browser")) return "browser";
  if (lowered.includes("web")) return "web";
  if (lowered.includes("agent")) return "subagent";
  if (lowered.includes("plan") || lowered.includes("todo") || lowered.includes("switchmode")) return "planning";
  return "other";
}

function projectKey(project: string): string {
  return project.replace(/^\//, "").replaceAll("/", "-");
}

function sourceProjectKey(source: string): string | null {
  const parts = source.split("/");
  const projects = parts.lastIndexOf("projects");
  return projects >= 0 ? parts[projects + 1] ?? null : null;
}

function sourceMatchesProject(source: string, project: string | null): boolean {
  if (!project) return true;
  const actual = sourceProjectKey(source);
  const expected = projectKey(project);
  return actual === expected || Boolean(actual?.startsWith(`${expected}-`));
}

function metadataDatabasePath(home: string): string {
  return join(dirname(home), "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
}

function cursorMetadata(home: string, sessionIds: string[]): Map<string, CursorMetadata> {
  const metadata = new Map<string, CursorMetadata>();
  const path = metadataDatabasePath(home);
  if (sessionIds.length === 0 || !Bun.file(path).size) return metadata;
  let database: Database | null = null;
  try {
    database = new Database(path, { readonly: true, strict: true });
    const placeholders = sessionIds.map(() => "?").join(",");
    const rows = database.query(
      `SELECT h.composerId, h.createdAt, h.lastUpdatedAt, k.value
       FROM composerHeaders h
       LEFT JOIN cursorDiskKV k ON k.key = 'composerData:' || h.composerId
       WHERE h.composerId IN (${placeholders})`,
    ).all(...sessionIds);
    for (const rawRow of rows) {
      const row = asRecord(rawRow);
      const composerId = asString(row.composerId);
      if (!composerId) continue;
      const data = typeof row.value === "string" ? parseJsonRecord(row.value) ?? {} : {};
      const modelConfig = asRecord(data.modelConfig);
      const workspace = asRecord(data.workspaceIdentifier);
      const rawUri = workspace.uri;
      const uri = typeof rawUri === "string"
        ? rawUri
        : asString(asRecord(rawUri).fsPath) ?? asString(asRecord(rawUri).external) ?? asString(asRecord(rawUri).path);
      metadata.set(composerId, {
        createdAt: asNumber(data.createdAt) ?? asNumber(row.createdAt),
        updatedAt: asNumber(data.lastUpdatedAt) ?? asNumber(row.lastUpdatedAt),
        model: asString(modelConfig.modelName),
        projectPath: uri?.replace(/^file:\/\//, "") ?? null,
        linesAdded: asNumber(data.totalLinesAdded),
        linesRemoved: asNumber(data.totalLinesRemoved),
        filesChangedCount: asNumber(data.filesChangedCount),
        sessionSettings: extractComposerSettings(data),
      });
    }
  } catch {
    return metadata;
  } finally {
    database?.close();
  }
  return metadata;
}

async function inspectSession(source: string, metadata: CursorMetadata | null, requestedProject: string | null, home: string): Promise<NormalizedSession> {
  const sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
  const session = emptySession("cursor", sessionId, source);
  const fileModifiedAt = await modifiedAt(source);
  session.startedAt = isoFromEpoch(metadata?.createdAt ?? fileModifiedAt);
  session.updatedAt = isoFromEpoch(metadata?.updatedAt ?? fileModifiedAt);
  session.projectPath = metadata?.projectPath ?? requestedProject ?? sourceProjectKey(source);
  if (metadata?.model) session.models.push(metadata.model);
  if (metadata) {
    session.activity.linesAdded = metadata.linesAdded;
    session.activity.linesRemoved = metadata.linesRemoved;
    session.activity.filesChangedCount = metadata.filesChangedCount;
  }
  let invalidLines = 0;
  let messageIndex = -1;
  for await (const raw of jsonLines(source)) {
    if (!isRecord(raw)) {
      invalidLines += 1;
      continue;
    }
    const role = asString(raw.role);
    if (role === "user" || role === "assistant") session.messages[role] += 1;
    if (role === "user") {
      messageIndex += 1;
      session.turns = (session.turns ?? 0) + 1;
    }
    const message = asRecord(raw.message);
    for (const rawPart of asArray(message.content)) {
      if (!isRecord(rawPart) || rawPart.type !== "tool_use") continue;
      let name = asString(rawPart.name) ?? "unknown";
      const input = rawPart.input;
      let toolCategory = category(name);
      if (name === "CallMcpTool") {
        const inputRecord = asRecord(input);
        const server = asString(inputRecord.server);
        const tool = asString(inputRecord.toolName);
        if (server && tool) name = `${server}.${tool}`;
        toolCategory = "mcp";
      }
      const cwd = session.projectPath?.startsWith("/") ? session.projectPath : null;
      const files = toolCategory === "file_read"
        ? fileEventsFromPaths(pathFields(input), "read", cwd)
        : toolCategory === "file_edit"
          ? [...patchFileEvents(input, cwd), ...fileEventsFromPaths(pathFields(input), "edit", cwd)]
          : toolCategory === "shell"
            ? shellReadEvents(input, cwd)
            : [];
      addToolEvent(session, { name, category: toolCategory, callId: asString(rawPart.id), messageIndex: Math.max(messageIndex, 0), files, urls: toolCategory === "web" || toolCategory === "browser" ? visitedUrls(input) : [] });
      const counts = commandCounts(input);
      session.activity.testOrCheckCalls += counts.tests;
      session.activity.gitCalls += counts.git;
      if (toolCategory === "web" && isWebSearchTool(name)) session.activity.webSearches += 1;
    }
  }
  session.coverage = { messages: true, skills: true, toolCalls: true, toolResults: false, tokens: false, files: true };
  session.diagnostics.push("Las transcripciones de Cursor conservan tool_use, pero no resultados ni errores de forma comparable");
  const turns = await readCursorUsage(home, sessionId);
  session.cursorUsage = { scope: "whole-session", agentScope: "parent-only", transcriptTurns: session.messages.user, turns };
  const hookSettings = turns.reduce((acc, turn) => turn.settings ? mergeSessionSettings(turn.settings, acc) : acc, emptySessionSettings());
  const sessionSettings = mergeSessionSettings(metadata?.sessionSettings ?? emptySessionSettings(), hookSettings);
  if (hasSessionSettings(sessionSettings)) session.sessionSettings = sessionSettings;
  const contextUsage = summarizeContextUsage(turns);
  if (contextUsage.peakInputTokens !== null || contextUsage.lastInputTokens !== null) session.contextUsage = contextUsage;
  if (turns.length) {
    session.tokens = sumCursorUsage(turns);
    session.coverage.tokens = turns.some(turn => turn.values.total !== null);
    session.models = [...new Set([...session.models, ...turns.flatMap(turn => turn.model ? [turn.model] : [])])];
  }
  session.diagnostics.push(`Cursor: ${turns.length} turnos capturados por hook; ${session.messages.user} mensajes de usuario en la transcripción. Solo agente principal; totales de lo observado, sin atribución a intervalos ni precio por llamada.`);
  if (invalidLines > 0) session.diagnostics.push(`${invalidLines} líneas JSONL inválidas`);
  return session;
}

export async function analyzeCursor(request: AnalyzeRequest): Promise<AnalysisReport> {
  const allSources = (await findFiles(join(request.home, "projects"), ".jsonl")).filter((source) => source.includes("/agent-transcripts/"));
  const metadata = cursorMetadata(request.home, allSources.map((source) => source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source));
  const sources = allSources.filter((source) => {
    const sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
    const projectPath = metadata.get(sessionId)?.projectPath;
    return projectPath ? projectMatches(projectPath, request.project) : sourceMatchesProject(source, request.project);
  });
  const ordered = await Promise.all(sources.map(async (source) => {
    const sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
    return { source, sortAt: metadata.get(sessionId)?.updatedAt ?? await modifiedAt(source) };
  }));
  ordered.sort((a, b) => b.sortAt - a.sortAt);
  const sessions = await Promise.all(ordered.slice(0, request.limit).map(({ source }) => {
    const sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
    return inspectSession(source, metadata.get(sessionId) ?? null, request.project, request.home);
  }));
  const diagnostics = sources.length === 0 ? ["No se encontraron transcripciones JSONL de Cursor para el filtro indicado"] : [];
  return buildReport("cursor", request.home, request.project, request.limit, sessions, { matchedSessions: sources.length, diagnostics });
}
