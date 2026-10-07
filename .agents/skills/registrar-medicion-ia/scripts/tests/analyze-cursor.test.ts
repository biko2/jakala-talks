import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeCursor } from "../src/adapters/cursor.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("analyzeCursor", () => {
  test("normalizes file changes and MCP calls from a transcript", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-cursor-"));
    temporaryDirectories.push(root);
    const home = join(root, ".cursor");
    const project = join(root, "project");
    const projectKey = project.slice(1).replaceAll("/", "-");
    const sessionId = "cursor-1";
    const sourceDirectory = join(home, "projects", projectKey, "agent-transcripts", sessionId);
    await mkdir(sourceDirectory, { recursive: true });
    const events = [
      { role: "user", message: { content: [{ type: "text", text: "private" }] } },
      { role: "assistant", message: { content: [
        { type: "tool_use", id: "patch", name: "ApplyPatch", input: { patch: "*** Add File: src/new.ts\n*** Update File: /tmp/skills/example/SKILL.md" } },
        { type: "tool_use", id: "mcp", name: "CallMcpTool", input: { server: "ai-hub", toolName: "create_ai_measurement" } },
        { type: "tool_use", id: "search", name: "rg", input: { path: "/tmp/skills/not-used/SKILL.md" } },
        { type: "tool_use", id: "web", name: "WebFetch", input: { url: "https://example.com/page?a=1#cursor" } },
      ] } },
    ];
    await writeFile(join(sourceDirectory, `${sessionId}.jsonl`), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);

    const session = (await analyzeCursor({ home, project, limit: 1 })).sessions[0];

    expect(session?.skills).toEqual({ example: { reads: 0, edits: 1, attributedMessages: 0 } });
    expect(new Set(session?.activity.filesChanged)).toEqual(new Set([join(project, "src/new.ts"), "/tmp/skills/example/SKILL.md"]));
    expect(session?.activity.filesCreated).toEqual([join(project, "src/new.ts")]);
    expect(session?.activity.filesEdited).toEqual(["/tmp/skills/example/SKILL.md"]);
    expect(session?.tools["ai-hub.create_ai_measurement"]?.calls).toBe(1);
    expect(session?.toolCategories.mcp).toBe(1);
    expect(session?.activity.mcpServers).toEqual(["ai-hub"]);
    expect(session?.activity.webPages).toEqual(["https://example.com/page?a=1#cursor"]);
    expect(session?.activity.webSearches).toBe(0);
    expect(session?.coverage.toolResults).toBeFalse();
  });

  test("enriches sessions from Cursor's metadata database", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-cursor-db-"));
    temporaryDirectories.push(root);
    const home = join(root, ".cursor");
    const project = join(root, "project");
    const sessionId = "cursor-db";
    const sourceDirectory = join(home, "projects", "fallback", "agent-transcripts", sessionId);
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, `${sessionId}.jsonl`), `${JSON.stringify({ role: "user", message: { content: [] } })}\n`);
    const databasePath = join(root, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
    await mkdir(join(databasePath, ".."), { recursive: true });
    const database = new Database(databasePath, { create: true });
    database.run("CREATE TABLE composerHeaders (composerId TEXT, createdAt INTEGER, lastUpdatedAt INTEGER)");
    database.run("CREATE TABLE cursorDiskKV (key TEXT, value TEXT)");
    database.run("INSERT INTO composerHeaders VALUES (?, ?, ?)", [sessionId, 1000, 2000]);
    database.run("INSERT INTO cursorDiskKV VALUES (?, ?)", [`composerData:${sessionId}`, JSON.stringify({
      modelConfig: {
        maxMode: true,
        modelName: "cursor-model",
        selectedModels: [{ modelId: "cursor-model", parameters: [{ id: "effort", value: "low" }, { id: "fast", value: "true" }] }],
      },
      workspaceIdentifier: { uri: { fsPath: project } },
      totalLinesAdded: 12,
      totalLinesRemoved: 3,
      filesChangedCount: 2,
      contextTokensUsed: 116745,
      contextTokenLimit: 256000,
      contextUsagePercent: 45.6,
      prompt: "PRIVATE",
    })]);
    database.close();

    const session = (await analyzeCursor({ home, project, limit: 1 })).sessions[0];

    expect(session?.projectPath).toBe(project);
    expect(session?.models).toEqual(["cursor-model"]);
    expect(session?.activity.linesAdded).toBe(12);
    expect(session?.sessionSettings).toEqual({
      effort: "low",
      maxMode: true,
      fast: true,
      contextTokensUsed: 116745,
      contextTokenLimit: 256000,
      contextUsagePercent: 45.6,
    });
    expect(JSON.stringify(session)).not.toContain("PRIVATE");
  });

  test("reports when the project has no Cursor transcripts", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-cursor-empty-"));
    temporaryDirectories.push(root);

    const report = await analyzeCursor({ home: join(root, ".cursor"), project: join(root, "project"), limit: 4 });

    expect(report.sessions).toEqual([]);
    expect(report.diagnostics).toEqual(["No se encontraron transcripciones JSONL de Cursor para el filtro indicado"]);
  });
});
