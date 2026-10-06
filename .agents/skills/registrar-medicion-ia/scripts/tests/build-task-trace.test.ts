import { describe, expect, test } from "bun:test";
import { buildTaskTrace } from "../src/application/build-task-trace.ts";

const report = {
  schemaVersion: "1.0",
  harness: "codex",
  sessions: [{
    sessionId: "session-1",
    sourcePath: "/traces/session-1.jsonl",
    projectPath: "/project",
    models: ["model-x"],
    tokens: { input: 100, cachedInput: 20, cacheWriteInput: 0, output: 30, reasoningOutput: 5, total: 130, secret: "private token content" },
    tokenUsageByMessage: [
      { messageIndex: 0, cumulative: true, values: { input: 40, cachedInput: 10, cacheWriteInput: 0, output: 10, reasoningOutput: 2, total: 50 } },
      { messageIndex: 1, cumulative: true, values: { input: 65, cachedInput: 15, cacheWriteInput: 0, output: 15, reasoningOutput: 3, total: 80 } },
    ],
    prompt: "must never leave this process",
    events: [
      { messageIndex: 0, timestamp: "2026-01-01T10:00:00Z", tool: "Read", category: "file_read", mcpServer: null, files: [{ path: "/project/README.md", action: "read", kind: "documentation" }], urls: [], skills: [], skillAssets: [] },
      { messageIndex: 1, timestamp: "2026-01-01T10:01:00Z", tool: "web.open", category: "web", mcpServer: null, files: [], urls: ["https://example.com/page?a=1#section"], skills: ["research"], skillAssets: [{ skill: "research", type: "references" }] },
      { messageIndex: 2, timestamp: "2026-01-01T10:02:00Z", tool: "Write", category: "file_edit", mcpServer: null, files: [{ path: "/project/secret.ts", action: "edit", kind: "ts", content: "private" }], urls: [], skills: [], skillAssets: [] },
    ],
  }],
};

describe("buildTaskTrace", () => {
  test("exports only safe metadata from selected message ranges", () => {
    const trace = buildTaskTrace({
      report,
      slices: [{ harness: "codex", sessionId: "session-1", fromMessage: 0, toMessage: 1 }],
      manualSkills: ["research"],
      automaticSkills: [],
      completedSkills: ["research"],
      now: new Date("2026-01-01T11:00:00Z"),
    });

    expect(trace.sessionSlices[0]).toEqual({
      harness: "codex",
      sessionId: "session-1",
      sourcePath: "/traces/session-1.jsonl",
      projectPath: "/project",
      fromMessage: 0,
      toMessage: 1,
      startedAt: "2026-01-01T10:00:00Z",
      endedAt: "2026-01-01T10:01:00Z",
      eventCount: 2,
    });
    expect(trace.files).toEqual([{ path: "/project/README.md", action: "read", kind: "documentation" }]);
    expect(trace.webPages).toEqual(["https://example.com/page?a=1#section"]);
    expect(trace.skills.research).toEqual({ loaded: 1, statusObserved: 1, referencesRead: 1, manuallyInvoked: 1, completed: 1 });
    expect(JSON.stringify(trace)).not.toContain("must never");
    expect(JSON.stringify(trace)).not.toContain("private");
    expect(trace.tokens[0]).toEqual({ harness: "codex", sessionId: "session-1", scope: "message-range", values: { input: 65, cachedInput: 15, cacheWriteInput: 0, output: 15, reasoningOutput: 3, total: 80 } });
  });

  test("rejects a slice that does not exist", () => {
    expect(() => buildTaskTrace({ report, slices: [{ harness: "cursor", sessionId: "missing", fromMessage: 0, toMessage: null }] })).toThrow("No existe cursor/missing");
  });

  test("subtracts cumulative snapshots at the start of a slice", () => {
    const trace = buildTaskTrace({ report, slices: [{ harness: "codex", sessionId: "session-1", fromMessage: 1, toMessage: 1 }] });

    expect(trace.tokens[0]?.values).toEqual({ input: 25, cachedInput: 5, cacheWriteInput: 0, output: 5, reasoningOutput: 1, total: 30 });
  });
});
