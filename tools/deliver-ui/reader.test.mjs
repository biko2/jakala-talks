import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseRunContent,
  toListItem,
  listRuns,
  nullableNumber,
  getRun,
} from "./reader.mjs";

const validRun = {
  schemaVersion: "1",
  recordedAt: "2026-10-02T12:59:00.000Z",
  workflow: "deliver",
  mode: "three-gates",
  harness: "cursor",
  model: "claude-sonnet-4-6",
  parentIssue: { number: 42, url: "https://github.com/org/repo/issues/42" },
  ticketIssues: [{ number: 43, url: "https://github.com/org/repo/issues/43" }],
  pr: { number: 99, url: "https://github.com/org/repo/pull/99" },
  branch: "feat/42-slug",
  humanGates: {
    grillConfirmed: true,
    specConfirmed: true,
    ticketsConfirmed: true,
  },
  ci: { status: "passed", checksFailed: [] },
  acceptance: { met: 3, total: 3 },
  specGaps: [],
  tokens: {
    scope: "parent-only",
    coverage: "unknown",
    values: {
      input: null,
      output: null,
      cachedInput: null,
      cacheWriteInput: null,
      reasoningOutput: null,
      total: null,
    },
  },
  tools: { Shell: 2 },
  toolCategories: { shell: 2 },
  skills: {},
  traceMetadata: null,
  notes: "tokens de subagentes no incluidos",
};

describe("nullableNumber", () => {
  it("keeps null and rejects invented zeros from bad input", () => {
    assert.equal(nullableNumber(null), null);
    assert.equal(nullableNumber(undefined), null);
    assert.equal(nullableNumber("0"), null);
    assert.equal(nullableNumber(NaN), null);
    assert.equal(nullableNumber(12), 12);
    assert.equal(nullableNumber(0), 0);
  });
});

describe("parseRunContent", () => {
  it("parses a valid run", () => {
    const parsed = parseRunContent(JSON.stringify(validRun), "2026-10-02T125900Z-42");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.data.model, "claude-sonnet-4-6");
  });

  it("marks broken JSON without throwing", () => {
    const parsed = parseRunContent("{not-json", "broken");
    assert.equal(parsed.ok, false);
    assert.match(parsed.error, /JSON/i);
  });
});

describe("toListItem", () => {
  it("keeps tokens total null when unknown", () => {
    const item = toListItem(
      parseRunContent(JSON.stringify(validRun), "2026-10-02T125900Z-42")
    );
    assert.equal(item.valid, true);
    assert.equal(item.tokensTotal, null);
    assert.equal(item.ciStatus, "passed");
    assert.equal(item.acceptanceMet, 3);
    assert.equal(item.parentIssue.number, 42);
  });

  it("surfaces parse errors as invalid list rows", () => {
    const item = toListItem({ ok: false, id: "x", error: "JSON inválido" });
    assert.equal(item.valid, false);
    assert.equal(item.tokensTotal, null);
    assert.equal(item.ciStatus, "unknown");
  });
});

describe("listRuns / getRun", () => {
  it("lists valid and broken files; getRun returns full payload", () => {
    const dir = mkdtempSync(join(tmpdir(), "deliver-runs-"));
    try {
      writeFileSync(
        join(dir, "2026-10-02T125900Z-42.json"),
        JSON.stringify(validRun)
      );
      writeFileSync(join(dir, "bad.json"), "{");

      const listed = listRuns(dir);
      assert.equal(listed.length, 2);
      const good = listed.find((r) => r.id === "2026-10-02T125900Z-42");
      const bad = listed.find((r) => r.id === "bad");
      assert.equal(good.valid, true);
      assert.equal(good.tokensTotal, null);
      assert.equal(bad.valid, false);

      const detail = getRun(dir, "2026-10-02T125900Z-42");
      assert.equal(detail.ok, true);
      assert.equal(detail.data.branch, "feat/42-slug");

      const missing = getRun(dir, "nope");
      assert.equal(missing.ok, false);
      assert.equal(missing.status, 404);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
