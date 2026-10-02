import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeClaude } from "../src/adapters/claude.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("analyzeClaude", () => {
  test("combines attribution, actual skill reads, tool results and unique token usage", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-claude-"));
    temporaryDirectories.push(root);
    const home = join(root, ".claude");
    const project = join(root, "project");
    const source = join(home, "projects", "project", "claude-1.jsonl");
    await mkdir(join(home, "projects", "project"), { recursive: true });
    const assistant = {
      type: "assistant",
      sessionId: "claude-1",
      cwd: project,
      timestamp: "2026-01-01T10:00:00Z",
      attributionSkill: "example",
      message: {
        id: "msg-1",
        role: "assistant",
        model: "claude-test",
        usage: { input_tokens: 10, cache_read_input_tokens: 4, cache_creation_input_tokens: 2, output_tokens: 3 },
        content: [{ type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/tmp/skills/example/SKILL.md" } }],
      },
    };
    const events = [
      { type: "user", sessionId: "claude-1", cwd: project, timestamp: "2026-01-01T09:59:59Z", message: { role: "user", content: [{ type: "text", text: "private" }] } },
      assistant,
      assistant,
      { type: "user", sessionId: "claude-1", cwd: project, timestamp: "2026-01-01T10:00:01Z", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "tool-1", is_error: false, content: "private" }] } },
    ];
    await writeFile(source, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);

    const session = (await analyzeClaude({ home, project, limit: 1 })).sessions[0];

    expect(session?.skills.example).toEqual({ reads: 2, edits: 0, attributedMessages: 2 });
    expect(session?.tools.Read).toEqual({ calls: 2, results: 1, errors: 0 });
    expect(session?.tokens).toEqual({ input: 16, cachedInput: 4, cacheWriteInput: 2, output: 3, reasoningOutput: null, total: 19 });
    expect(session?.tokenUsageByMessage).toEqual([{ messageIndex: 0, cumulative: false, values: { input: 16, cachedInput: 4, cacheWriteInput: 2, output: 3, reasoningOutput: null, total: 19 } }]);
    expect(session?.messages).toEqual({ user: 2, assistant: 2 });
  });

  test("does not infer a skill from a search input", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-claude-search-"));
    temporaryDirectories.push(root);
    const home = join(root, ".claude");
    const project = join(root, "project");
    const source = join(home, "projects", "project", "claude-search.jsonl");
    await mkdir(join(home, "projects", "project"), { recursive: true });
    await writeFile(source, `${JSON.stringify({ type: "assistant", sessionId: "claude-search", cwd: project, message: { role: "assistant", content: [{ type: "tool_use", id: "search", name: "Grep", input: { pattern: "SKILL.md", path: "/tmp/skills/not-used/SKILL.md" } }] } })}\n`);

    const session = (await analyzeClaude({ home, project, limit: 1 })).sessions[0];

    expect(session?.skills).toEqual({});
    expect(session?.activity.filesRead).toEqual([]);
  });

  test("keeps indexed sessions with explicit partial coverage when JSONL is gone", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-claude-index-"));
    temporaryDirectories.push(root);
    const home = join(root, ".claude");
    const project = join(root, "project");
    const indexPath = join(home, "projects", "project", "sessions-index.json");
    await mkdir(join(home, "projects", "project"), { recursive: true });
    await writeFile(indexPath, JSON.stringify({ entries: [{ sessionId: "missing-jsonl", projectPath: project, fullPath: join(root, "gone.jsonl"), created: "2026-01-01T10:00:00Z", modified: "2026-01-01T11:00:00Z", messageCount: 3 }] }));

    const report = await analyzeClaude({ home, project, limit: 4 });

    expect(report.matchedSessions).toBe(1);
    expect(report.sessions[0]?.sessionId).toBe("missing-jsonl");
    expect(report.sessions[0]?.coverage.toolCalls).toBeFalse();
    expect(report.sessions[0]?.diagnostics[0]).toContain("JSONL ya no está disponible");
  });

  test("records direct writes and visited URLs without exporting search queries", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-claude-actions-"));
    temporaryDirectories.push(root);
    const home = join(root, ".claude");
    const project = join(root, "project");
    const source = join(home, "projects", "project", "claude-actions.jsonl");
    const visited = "https://example.com/docs?a=1#api";
    await mkdir(join(home, "projects", "project"), { recursive: true });
    await writeFile(source, `${JSON.stringify({ type: "assistant", sessionId: "claude-actions", cwd: project, message: { role: "assistant", content: [
      { type: "tool_use", id: "write", name: "Write", input: { file_path: "/tmp/skills/example/SKILL.md" } },
      { type: "tool_use", id: "fetch", name: "WebFetch", input: { url: visited } },
      { type: "tool_use", id: "search", name: "WebSearch", input: { query: "https://private.example/?q=secret" } },
    ] } })}\n`);

    const session = (await analyzeClaude({ home, project, limit: 1 })).sessions[0];

    expect(session?.skills.example).toEqual({ reads: 0, edits: 1, attributedMessages: 0 });
    expect(session?.activity.filesChanged).toEqual(["/tmp/skills/example/SKILL.md"]);
    expect(session?.activity.webPages).toEqual([visited]);
    expect(session?.activity.webSearches).toBe(1);
  });
});
