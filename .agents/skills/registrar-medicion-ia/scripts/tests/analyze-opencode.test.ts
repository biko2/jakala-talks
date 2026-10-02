import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeOpenCode } from "../src/adapters/opencode.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("analyzeOpenCode", () => {
  test("reads sessions, tools, results, skills and tokens from SQLite", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-opencode-"));
    temporaryDirectories.push(root);
    const home = join(root, "opencode");
    const project = join(root, "project");
    await mkdir(home, { recursive: true });
    const database = new Database(join(home, "opencode.db"), { create: true });
    database.run("CREATE TABLE session (id TEXT, directory TEXT, time_created INTEGER, time_updated INTEGER, model TEXT, cost REAL, tokens_input INTEGER, tokens_output INTEGER, tokens_reasoning INTEGER, tokens_cache_read INTEGER, tokens_cache_write INTEGER)");
    database.run("CREATE TABLE message (id TEXT, session_id TEXT, time_created INTEGER, data TEXT)");
    database.run("CREATE TABLE part (id TEXT, message_id TEXT, session_id TEXT, time_created INTEGER, data TEXT)");
    database.run("INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ["open-1", project, 1000, 2000, JSON.stringify({ id: "model-x" }), 0.2, 10, 4, 2, 6, 1]);
    database.run("INSERT INTO message VALUES (?, ?, ?, ?)", ["user-1", "open-1", 1100, JSON.stringify({ role: "user" })]);
    database.run("INSERT INTO message VALUES (?, ?, ?, ?)", ["assistant-1", "open-1", 1200, JSON.stringify({ role: "assistant" })]);
    database.run("INSERT INTO part VALUES (?, ?, ?, ?, ?)", ["part-1", "assistant-1", "open-1", 1300, JSON.stringify({ type: "tool", tool: "skill", callID: "call-1", state: { status: "completed", input: { name: "example" } } })]);
    database.run("INSERT INTO part VALUES (?, ?, ?, ?, ?)", ["part-2", "assistant-1", "open-1", 1400, JSON.stringify({ type: "tool", tool: "mcp__ai_hub__create_ai_measurement", callID: "call-2", state: { status: "error", input: {} } })]);
    database.run("INSERT INTO part VALUES (?, ?, ?, ?, ?)", ["part-3", "assistant-1", "open-1", 1500, JSON.stringify({ type: "tool", tool: "webfetch", callID: "call-3", state: { status: "completed", input: { url: "https://example.com/page?a=1#opencode" } } })]);
    database.run("INSERT INTO part VALUES (?, ?, ?, ?, ?)", ["part-4", "assistant-1", "open-1", 1600, JSON.stringify({ type: "tool", tool: "websearch", callID: "call-4", state: { status: "completed", input: { query: "https://private.example/?q=secret" } } })]);
    database.close();

    const session = (await analyzeOpenCode({ home, project, limit: 1 })).sessions[0];

    expect(session?.skills.example).toEqual({ reads: 1, edits: 0, attributedMessages: 0 });
    expect(session?.tools.skill).toEqual({ calls: 1, results: 1, errors: 0 });
    expect(session?.tools.mcp__ai_hub__create_ai_measurement).toEqual({ calls: 1, results: 1, errors: 1 });
    expect(session?.activity.mcpServers).toEqual(["ai_hub"]);
    expect(session?.activity.webPages).toEqual(["https://example.com/page?a=1#opencode"]);
    expect(session?.activity.webSearches).toBe(1);
    expect(session?.tokens).toEqual({ input: 10, cachedInput: 6, cacheWriteInput: 1, output: 4, reasoningOutput: 2, total: 16 });
    expect(session?.cost).toBe(0.2);
  });

  test("reports missing storage without throwing", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-opencode-missing-"));
    temporaryDirectories.push(root);

    const report = await analyzeOpenCode({ home: join(root, "missing"), project: null, limit: 4 });

    expect(report.sessions).toEqual([]);
    expect(report.diagnostics).toEqual(["No se encontró la base de datos de OpenCode"]);
  });
});
