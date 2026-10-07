import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  applyHookUsage,
  enrichRunWithHook,
  readHookTurns,
  resolveSessionId,
  sumHookTurns,
} from "./hook.mjs";

function writeTurn(home, sessionId, recordedAt, extra = {}) {
  const folder = join(home, "ai-hub-usage", createHash("sha256").update(sessionId).digest("hex"));
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, `${recordedAt}.json`),
    JSON.stringify({
      conversationId: sessionId,
      generationId: extra.generationId || recordedAt,
      model: extra.model || "claude-sonnet-4-6",
      recordedAt,
      values: extra.values || {
        input: 1_000_000,
        output: 1_000_000,
        cachedInput: 0,
        cacheWriteInput: 0,
        total: 2_000_000,
      },
    })
  );
}

describe("sumHookTurns", () => {
  it("sums parent counters and keeps unknown keys null", () => {
    const values = sumHookTurns([
      {
        values: {
          input: 100,
          output: 20,
          cachedInput: 10,
          cacheWriteInput: 5,
          total: 120,
          reasoningOutput: null,
        },
      },
      {
        values: {
          input: 50,
          output: 10,
          cachedInput: 0,
          cacheWriteInput: 0,
          total: 60,
          reasoningOutput: null,
        },
      },
    ]);
    assert.deepEqual(values, {
      input: 150,
      output: 30,
      cachedInput: 10,
      cacheWriteInput: 5,
      total: 180,
      reasoningOutput: null,
    });
  });

  it("returns empty counters when there are no turns", () => {
    assert.deepEqual(sumHookTurns([]), {
      input: null,
      output: null,
      cachedInput: null,
      cacheWriteInput: null,
      total: null,
      reasoningOutput: null,
    });
  });
});

describe("applyHookUsage", () => {
  it("writes parent-only hook tokens and leaves totalUsd null", () => {
    const result = applyHookUsage(
      { model: "claude-sonnet-4-6", tokens: { coverage: "unknown" } },
      [
        {
          model: "claude-sonnet-4-6",
          values: {
            input: 1_000_000,
            output: 1_000_000,
            cachedInput: 0,
            cacheWriteInput: 0,
            total: 2_000_000,
            reasoningOutput: null,
          },
        },
      ]
    );
    assert.equal(result.applied, true);
    assert.equal(result.run.tokens.scope, "parent-only");
    assert.equal(result.run.tokens.coverage, "hook");
    assert.equal(result.run.tokens.values.input, 1_000_000);
    assert.equal(result.run.cost.totalUsd, null);
    assert.equal(result.run.cost.subtotalUsd, 18);
    assert.equal(result.run.cost.coverage, "partial");
    assert.equal(result.run.cost.kind, "api-equivalent");
    assert.equal(result.run.cost.scope, "parent-only");
  });

  it("does not invent tokens when the hook has no turns", () => {
    const run = { tokens: { coverage: "unknown" } };
    const result = applyHookUsage(run, []);
    assert.equal(result.applied, false);
    assert.equal(result.run, run);
  });
});

describe("readHookTurns", () => {
  it("reads allowlisted counters from the Cursor usage folder", () => {
    const home = mkdtempSync(join(tmpdir(), "deliver-hook-"));
    const sessionId = "conversation-42";
    const folder = join(
      home,
      "ai-hub-usage",
      createHash("sha256").update(sessionId).digest("hex")
    );
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      join(folder, "turn.json"),
      JSON.stringify({
        conversationId: sessionId,
        generationId: "gen-1",
        model: "claude-sonnet-4-6",
        recordedAt: "2026-10-03T12:00:00.000Z",
        values: { input: 40, output: 8, cachedInput: 2, cacheWriteInput: 1, total: 48 },
      })
    );
    const turns = readHookTurns(home, sessionId);
    assert.equal(turns.length, 1);
    assert.equal(turns[0].generationId, "gen-1");
    assert.equal(turns[0].values.input, 40);
    assert.equal(turns[0].values.output, 8);
  });
});

describe("resolveSessionId", () => {
  it("keeps an explicit session that already has hook turns", () => {
    const home = mkdtempSync(join(tmpdir(), "deliver-hook-"));
    writeTurn(home, "keep-me", "2026-10-03T12:00:00.000Z");
    writeTurn(home, "newer-other", "2026-10-06T09:00:00.000Z");
    assert.equal(
      resolveSessionId({ traces: { sessionId: "keep-me" } }, { usageHome: home }),
      "keep-me"
    );
  });

  it("skips placeholder ids and picks the newest project transcript with turns", () => {
    const home = mkdtempSync(join(tmpdir(), "deliver-hook-"));
    writeTurn(home, "old-chat", "2026-10-01T12:00:00.000Z");
    writeTurn(home, "this-chat", "2026-10-06T09:00:00.000Z");
    writeTurn(home, "other-project", "2026-10-06T10:00:00.000Z");
    assert.equal(
      resolveSessionId({ traces: { sessionId: "example-session" } }, {
        usageHome: home,
        transcriptIds: ["old-chat", "this-chat"],
      }),
      "this-chat"
    );
  });

  it("falls back to the newest hook conversation when no transcript matches", () => {
    const home = mkdtempSync(join(tmpdir(), "deliver-hook-"));
    writeTurn(home, "a", "2026-10-01T12:00:00.000Z");
    writeTurn(home, "b", "2026-10-06T09:00:00.000Z");
    assert.equal(resolveSessionId({}, { usageHome: home }), "b");
  });
});

describe("enrichRunWithHook", () => {
  it("discovers a session and stamps traces.sessionId", () => {
    const home = mkdtempSync(join(tmpdir(), "deliver-hook-"));
    writeTurn(home, "auto-sess", "2026-10-06T09:00:00.000Z");
    const enriched = enrichRunWithHook({ model: "claude-sonnet-4-6" }, home);
    assert.equal(enriched.traces.sessionId, "auto-sess");
    assert.equal(enriched.tokens.coverage, "hook");
    assert.equal(enriched.cost.subtotalUsd, 18);
    assert.equal(enriched.traces.contextUsage.peakInputTokens, 1_000_000);
    assert.equal(enriched.traces.contextUsage.lastInputTokens, 1_000_000);
  });

  it("overlays effort and context window from composerData", () => {
    const root = mkdtempSync(join(tmpdir(), "deliver-composer-"));
    const home = join(root, ".cursor");
    const sessionId = "composer-sess";
    writeTurn(home, sessionId, "2026-10-06T09:00:00.000Z", {
      values: { input: 667687, output: 10, cachedInput: 0, cacheWriteInput: 0, total: 667697 },
    });
    const db = join(root, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
    mkdirSync(join(db, ".."), { recursive: true });
    const composerJson = JSON.stringify({
      modelConfig: {
        maxMode: false,
        modelName: "grok-4.6",
        selectedModels: [
          {
            modelId: "grok-4.6",
            parameters: [
              { id: "effort", value: "medium" },
              { id: "fast", value: "false" },
            ],
          },
        ],
      },
      contextTokensUsed: 116745,
      contextTokenLimit: 256000,
      contextUsagePercent: 45.6,
      prompt: "PRIVATE",
    }).replaceAll("'", "''");
    const sql = `
      CREATE TABLE cursorDiskKV (key TEXT, value TEXT);
      INSERT INTO cursorDiskKV VALUES ('composerData:${sessionId}', '${composerJson}');
    `;
    const created = spawnSync("sqlite3", [db], { input: sql, encoding: "utf8" });
    assert.equal(created.status, 0, created.stderr);
    const enriched = enrichRunWithHook({ model: "grok-4.6", traces: { sessionId } }, home);
    assert.equal(enriched.traces.settings.effort, "medium");
    assert.equal(enriched.traces.settings.maxMode, false);
    assert.equal(enriched.traces.settings.contextTokensUsed, 116745);
    assert.equal(enriched.traces.settings.contextTokenLimit, 256000);
    assert.equal(enriched.traces.contextUsage.peakInputTokens, 667687);
    assert.equal(JSON.stringify(enriched.traces).includes("PRIVATE"), false);
  });
});
