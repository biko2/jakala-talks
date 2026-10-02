import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inspectUserMessages } from "../src/application/inspect-user-messages.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("inspectUserMessages", () => {
  test("returns only user-authored text and marks the report as local", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-messages-"));
    temporaryDirectories.push(root);
    const project = join(root, "project");
    const codexHome = join(root, ".codex");
    const claudeHome = join(root, ".claude");
    await mkdir(join(codexHome, "sessions"), { recursive: true });
    await mkdir(join(claudeHome, "projects", "project"), { recursive: true });
    await writeFile(join(codexHome, "sessions", "codex.jsonl"), [
      { type: "session_meta", payload: { id: "codex", cwd: project } },
      { type: "response_item", timestamp: "2026-01-01T10:00:00Z", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "codex request" }] } },
      { type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "assistant secret" }] } },
    ].map((event) => JSON.stringify(event)).join("\n"));
    await writeFile(join(claudeHome, "projects", "project", "claude.jsonl"), [
      { type: "user", sessionId: "claude", cwd: project, timestamp: "2026-01-01T11:00:00Z", message: { role: "user", content: [{ type: "text", text: "claude request" }, { type: "tool_result", content: "tool secret" }] } },
    ].map((event) => JSON.stringify(event)).join("\n"));

    const result = await inspectUserMessages({
      harness: "all",
      project,
      limit: 10,
      homes: { codex: codexHome, "claude-code": claudeHome, cursor: join(root, ".cursor"), opencode: join(root, "opencode") },
    });

    expect(result.localOnly).toBeTrue();
    expect(result.sessions.flatMap((session) => session.messages.map((message) => message.text))).toEqual(["claude request", "codex request"]);
    expect(JSON.stringify(result)).not.toContain("assistant secret");
    expect(JSON.stringify(result)).not.toContain("tool secret");
  });

  test("reads Cursor and OpenCode user messages through their native stores", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-native-messages-"));
    temporaryDirectories.push(root);
    const project = join(root, "project");
    const cursorHome = join(root, ".cursor");
    const projectKey = project.slice(1).replaceAll("/", "-");
    const cursorDirectory = join(cursorHome, "projects", projectKey, "agent-transcripts", "cursor-message");
    await mkdir(cursorDirectory, { recursive: true });
    await writeFile(join(cursorDirectory, "cursor-message.jsonl"), `${JSON.stringify({ role: "user", timestamp: "2026-01-01T10:00:00Z", message: { content: [{ type: "text", text: "cursor request" }] } })}\n`);
    const openCodeHome = join(root, "opencode");
    await mkdir(openCodeHome, { recursive: true });
    const database = new Database(join(openCodeHome, "opencode.db"), { create: true });
    database.run("CREATE TABLE session (id TEXT, directory TEXT, time_updated INTEGER)");
    database.run("CREATE TABLE message (id TEXT, session_id TEXT, time_created INTEGER, data TEXT)");
    database.run("CREATE TABLE part (id TEXT, message_id TEXT, time_created INTEGER, data TEXT)");
    database.run("INSERT INTO session VALUES (?, ?, ?)", ["open-message", project, 2000]);
    database.run("INSERT INTO message VALUES (?, ?, ?, ?)", ["open-user", "open-message", 1900, JSON.stringify({ role: "user" })]);
    database.run("INSERT INTO part VALUES (?, ?, ?, ?)", ["open-part", "open-user", 1900, JSON.stringify({ type: "text", text: "opencode request" })]);
    database.close();

    const result = await inspectUserMessages({
      harness: "all",
      project,
      limit: 10,
      homes: { codex: join(root, ".codex"), "claude-code": join(root, ".claude"), cursor: cursorHome, opencode: openCodeHome },
    });

    expect(new Set(result.sessions.flatMap((session) => session.messages.map((message) => message.text)))).toEqual(new Set(["cursor request", "opencode request"]));
  });
});
