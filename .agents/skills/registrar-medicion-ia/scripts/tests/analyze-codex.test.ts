import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeCodex } from "../src/adapters/codex.ts";

const temporaryDirectories: string[] = [];

async function fixture(eventsForProject: (project: string) => unknown[]): Promise<{ home: string; project: string }> {
  const root = await mkdtemp(join(tmpdir(), "agent-traces-codex-"));
  temporaryDirectories.push(root);
  const home = join(root, ".codex");
  const project = join(root, "project");
  const source = join(home, "sessions", "2026", "session.jsonl");
  await mkdir(join(home, "sessions", "2026"), { recursive: true });
  const events = eventsForProject(project);
  await writeFile(source, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
  return { home, project };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("analyzeCodex", () => {
  test("counts a skill only when SKILL.md is actually read", async () => {
    const { home, project } = await fixture((project) => [
      { type: "session_meta", timestamp: "2026-01-01T10:00:00Z", payload: { id: "codex-1", cwd: project } },
      { type: "response_item", payload: { type: "message", role: "user", content: [] } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", call_id: "search", input: "await tools.exec_command({cmd:\"rg --files /tmp/skills/compact/SKILL.md\"})" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", call_id: "read", input: "await tools.exec_command({cmd:\"sed -n '1,200p' /tmp/skills/example/SKILL.md\"})" } },
    ]);

    const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];

    expect(session?.skills).toEqual({ example: { reads: 1, edits: 0, attributedMessages: 0 } });
    expect(session?.activity.filesRead).toEqual(["/tmp/skills/example/SKILL.md"]);
  });

  test("does not emit sed arguments or wrapper text as files", async () => {
    const { home, project } = await fixture((project) => [
      { type: "session_meta", payload: { id: "codex-paths", cwd: project } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: "const r = await tools.exec_command({cmd:\"sed -n '1,100p' docs/a.md\\nsed -n '1,200p' docs/b.md\"}); text(r.output)" } },
    ]);

    const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];

    expect(session?.activity.filesRead).toEqual([join(project, "docs/a.md"), join(project, "docs/b.md")]);
  });

  test("records patch actions and preserves only actually visited URLs", async () => {
    const visitedUrl = "https://example.com/page?token=a%2Bb&view=full#section";
    const { home, project } = await fixture((project) => [
      { type: "session_meta", payload: { id: "codex-events", cwd: project } },
      { type: "response_item", payload: { type: "message", role: "user", content: [] } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", call_id: "patch", input: "await tools.apply_patch(\"*** Add File: src/new.ts\\n*** Update File: src/existing.ts\")" } },
      { type: "response_item", payload: { type: "custom_tool_call_output", call_id: "patch", output: { ok: true } } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: `await tools.web__run({\"open\":[{\"ref_id\":\"${visitedUrl}\"}]})` } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: "await tools.web__run({\"search_query\":[{\"q\":\"site:example.com https://private.example/?q=secret\"}]})" } },
    ]);

    const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];

    expect(new Set(session?.activity.filesChanged)).toEqual(new Set([join(project, "src/new.ts"), join(project, "src/existing.ts")]));
    expect(session?.activity.webPages).toEqual([visitedUrl]);
    expect(session?.activity.mcpServers).toEqual([]);
    expect(session?.tools.apply_patch).toEqual({ calls: 1, results: 1, errors: 0 });
  });

  test("does not treat patch-like fixture content as real file operations", async () => {
    const { home, project } = await fixture((project) => [
      { type: "session_meta", payload: { id: "codex-nested-patch", cwd: project } },
      {
        type: "response_item",
        payload: {
          type: "custom_tool_call",
          name: "exec",
          input: `await tools.apply_patch(${JSON.stringify("*** Begin Patch\n*** Update File: tests/parser.test.ts\n@@\n+ const fixture = '*** Add File: src/fake.ts\\n*** Update File: $target';\n+ const input = { path: '/tmp/fake.md' };\n*** End Patch")})`,
        },
      },
    ]);

    const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];

    expect(session?.activity.filesChanged).toEqual([join(project, "tests/parser.test.ts")]);
  });

  test("parses supported shell readers without treating option values as paths", async () => {
    const { home, project } = await fixture((project) => [
      "not-an-event",
      { type: "session_meta", payload: { id: "codex-readers", cwd: project } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: "await tools.exec_command({cmd:\"cat README.md; head -n 20 docs/head.md; tail -100 docs/tail.md\"})" } },
    ]);

    const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];

    expect(session?.activity.filesRead).toEqual([join(project, "README.md"), join(project, "docs/head.md"), join(project, "docs/tail.md")]);
    expect(session?.diagnostics).toEqual(["1 líneas JSONL inválidas"]);
  });

  test("deduplicates live and archived files by the canonical session id", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-codex-duplicate-"));
    temporaryDirectories.push(root);
    const home = join(root, ".codex");
    const project = join(root, "project");
    await mkdir(join(home, "sessions"), { recursive: true });
    await mkdir(join(home, "archived_sessions"), { recursive: true });
    await writeFile(join(home, "sessions", "live-name.jsonl"), [
      { type: "turn_context", payload: { cwd: project } },
      { type: "session_meta", payload: { id: "canonical-id", cwd: project } },
      { type: "session_meta", payload: { id: "parent-id", session_id: "parent-id", cwd: project } },
    ].map((event) => JSON.stringify(event)).join("\n"));
    await writeFile(join(home, "archived_sessions", "archive-name.jsonl"), `${JSON.stringify({ type: "session_meta", payload: { id: "canonical-id", cwd: project } })}\n`);

    const report = await analyzeCodex({ home, project, limit: 4 });

    expect(report.matchedSessions).toBe(1);
    expect(report.sessions.map((session) => session.sessionId)).toEqual(["canonical-id"]);
  });

  test("distinguishes MCP tools from internal tool namespaces", async () => {
    const { home, project } = await fixture((project) => [
      { type: "session_meta", payload: { id: "codex-mcp", cwd: project } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "mcp__ai_hub__create_ai_measurement", call_id: "mcp", input: "{}" } },
    ]);

    const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];

    expect(session?.toolCategories.mcp).toBe(1);
    expect(session?.activity.mcpServers).toEqual(["ai_hub"]);
  });
});

test("keeps per-call models and ignores repeated token snapshots", async () => {
  const usage = { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 100, total_tokens: 1100 };
  const token = { type: "event_msg", payload: { type: "token_count", info: { total_token_usage: usage, last_token_usage: usage } } };
  const { home, project } = await fixture((project) => [
    { type: "session_meta", payload: { id: "cost", cwd: project } },
    { type: "turn_context", payload: { model: "gpt-6-sol" } },
    { type: "response_item", payload: { type: "message", role: "user", content: [] } },
    token, token,
    { type: "turn_context", payload: { model: "future-model" } },
    { type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { ...usage, total_tokens: 2200 }, last_token_usage: usage } } },
  ]);
  const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];
  expect(session?.tokenCalls?.map((call) => call.model)).toEqual(["gpt-6-sol", "future-model"]);
});

test("does not price inherited usage or gaps as complete calls", async () => {
  const usage = { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 100, total_tokens: 1100 };
  const { home, project } = await fixture((project) => [
    { type: "session_meta", payload: { id: "gap", cwd: project } },
    { type: "turn_context", payload: { model: "gpt-6-sol" } },
    { type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { ...usage, total_tokens: 9000 }, last_token_usage: usage } } },
  ]);
  const session = (await analyzeCodex({ home, project, limit: 1 })).sessions[0];
  expect(session?.tokenCalls?.[0]?.values.input).toBeNull();
  expect(session?.diagnostics.join()).toContain("coste parcial");
});
