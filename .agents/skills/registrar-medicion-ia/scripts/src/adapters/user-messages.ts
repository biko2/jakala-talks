import { Database } from "bun:sqlite";
import { join } from "node:path";
import type { Harness } from "../domain/model.ts";
import { isoFromEpoch, projectMatches } from "../domain/normalization.ts";
import { findFiles, jsonLines, modifiedAt } from "../infrastructure/files.ts";
import type { UserMessage, UserMessageSession, UserMessageSource, UserMessageSourceRequest } from "../ports/user-message-source.ts";
import { asArray, asNumber, asRecord, asString, isRecord, parseJsonRecord } from "../shared/unknown.ts";

function textContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textContent).filter(Boolean).join("\n").trim();
  if (!isRecord(value)) return "";
  return asString(value.text) ?? asString(value.content) ?? "";
}

async function codexSessions(request: UserMessageSourceRequest): Promise<UserMessageSession[]> {
  const sources = [
    ...(await findFiles(join(request.home, "sessions"), ".jsonl")),
    ...(await findFiles(join(request.home, "archived_sessions"), ".jsonl")),
  ];
  const sessions: UserMessageSession[] = [];
  for (const source of sources) {
    let sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
    let projectPath: string | null = null;
    let updatedAt: string | null = null;
    const messages: Omit<UserMessage, "messageIndex">[] = [];
    for await (const raw of jsonLines(source)) {
      if (!isRecord(raw)) continue;
      const payload = asRecord(raw.payload);
      updatedAt = asString(raw.timestamp) ?? updatedAt;
      if (raw.type === "session_meta") {
        sessionId = asString(payload.id) ?? sessionId;
        projectPath = asString(payload.cwd) ?? projectPath;
      } else if (raw.type === "response_item" && payload.type === "message" && payload.role === "user") {
        messages.push({ timestamp: asString(raw.timestamp), text: textContent(payload.content) });
      }
    }
    if (projectMatches(projectPath, request.project)) {
      sessions.push({ harness: "codex", sessionId, projectPath, sourcePath: source, updatedAt: updatedAt ?? isoFromEpoch(await modifiedAt(source)), messages: messages.map((message, messageIndex) => ({ ...message, messageIndex })) });
    }
  }
  return sessions;
}

async function claudeSessions(request: UserMessageSourceRequest): Promise<UserMessageSession[]> {
  const sessions: UserMessageSession[] = [];
  for (const source of await findFiles(join(request.home, "projects"), ".jsonl")) {
    let sessionId = source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source;
    let projectPath: string | null = null;
    let updatedAt: string | null = null;
    const messages: Omit<UserMessage, "messageIndex">[] = [];
    for await (const raw of jsonLines(source)) {
      if (!isRecord(raw)) continue;
      sessionId = asString(raw.sessionId) ?? sessionId;
      projectPath = asString(raw.cwd) ?? projectPath;
      updatedAt = asString(raw.timestamp) ?? updatedAt;
      const message = asRecord(raw.message);
      if ((asString(message.role) ?? asString(raw.type)) !== "user") continue;
      const content = asArray(message.content).filter((part) => !isRecord(part) || part.type !== "tool_result");
      const text = textContent(content);
      if (text) messages.push({ timestamp: asString(raw.timestamp), text });
    }
    if (projectMatches(projectPath, request.project)) {
      sessions.push({ harness: "claude-code", sessionId, projectPath, sourcePath: source, updatedAt, messages: messages.map((message, messageIndex) => ({ ...message, messageIndex })) });
    }
  }
  return sessions;
}

function cursorProjectKey(project: string): string {
  return project.replace(/^\//, "").replaceAll("/", "-");
}

async function cursorSessions(request: UserMessageSourceRequest): Promise<UserMessageSession[]> {
  const sessions: UserMessageSession[] = [];
  for (const source of await findFiles(join(request.home, "projects"), ".jsonl")) {
    if (!source.includes("/agent-transcripts/")) continue;
    const parts = source.split("/");
    const projectIndex = parts.lastIndexOf("projects");
    const projectPath = parts[projectIndex + 1] ?? null;
    const expected = request.project ? cursorProjectKey(request.project) : null;
    if (expected && projectPath !== expected && !projectPath?.startsWith(`${expected}-`)) continue;
    const messages: Omit<UserMessage, "messageIndex">[] = [];
    for await (const raw of jsonLines(source)) {
      if (!isRecord(raw) || raw.role !== "user") continue;
      const message = asRecord(raw.message);
      const text = textContent(asArray(message.content));
      if (text) messages.push({ timestamp: asString(raw.timestamp), text });
    }
    sessions.push({
      harness: "cursor",
      sessionId: source.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? source,
      projectPath: request.project ?? projectPath,
      sourcePath: source,
      updatedAt: isoFromEpoch(await modifiedAt(source)),
      messages: messages.map((message, messageIndex) => ({ ...message, messageIndex })),
    });
  }
  return sessions;
}

async function openCodeSessions(request: UserMessageSourceRequest): Promise<UserMessageSession[]> {
  const source = join(request.home, "opencode.db");
  if (!Bun.file(source).size) return [];
  const database = new Database(source, { readonly: true, strict: true });
  try {
    const sessions: UserMessageSession[] = [];
    const rows = database.query("SELECT id, directory, time_updated FROM session ORDER BY time_updated DESC").all().map(asRecord);
    for (const row of rows) {
      const sessionId = asString(row.id);
      const projectPath = asString(row.directory);
      if (!sessionId || !projectMatches(projectPath, request.project)) continue;
      const grouped = new Map<string, { timestamp: string | null; parts: string[] }>();
      const messageRows = database.query(
        "SELECT m.id, m.time_created, m.data, p.data part_data FROM message m LEFT JOIN part p ON p.message_id = m.id WHERE m.session_id = ? ORDER BY m.time_created, p.time_created, p.id",
      ).all(sessionId).map(asRecord);
      for (const messageRow of messageRows) {
        const message = typeof messageRow.data === "string" ? parseJsonRecord(messageRow.data) ?? {} : {};
        const part = typeof messageRow.part_data === "string" ? parseJsonRecord(messageRow.part_data) ?? {} : {};
        if (message.role !== "user" || part.type !== "text") continue;
        const messageId = asString(messageRow.id);
        if (!messageId) continue;
        const item = grouped.get(messageId) ?? { timestamp: isoFromEpoch(asNumber(messageRow.time_created)), parts: [] };
        const text = asString(part.text);
        if (text) item.parts.push(text);
        grouped.set(messageId, item);
      }
      const messages = [...grouped.values()].map((item, messageIndex) => ({ timestamp: item.timestamp, text: item.parts.join("\n").trim(), messageIndex }));
      sessions.push({ harness: "opencode", sessionId, projectPath, sourcePath: source, updatedAt: isoFromEpoch(asNumber(row.time_updated)), messages });
    }
    return sessions;
  } finally {
    database.close();
  }
}

function source(harness: Harness, read: UserMessageSource["read"]): UserMessageSource {
  return { harness, read };
}

export const userMessageSources: Record<Harness, UserMessageSource> = {
  codex: source("codex", codexSessions),
  "claude-code": source("claude-code", claudeSessions),
  cursor: source("cursor", cursorSessions),
  opencode: source("opencode", openCodeSessions),
};
