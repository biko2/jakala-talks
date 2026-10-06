import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseRunContent,
  toListItem,
  listRuns,
  nullableNumber,
  getRun,
  resolveTimeline,
  normalizeCountMap,
  observabilityCounts,
  mergeUnifiedTimeline,
  filterUnifiedTimeline,
  resolveRunCost,
  resolveAgentGraph,
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
    assert.equal(item.modelTitle, "Claude Sonnet 4.6");
    assert.equal(item.tokensTotal, null);
    assert.equal(item.costUsd, null);
    assert.equal(item.costCoverage, "unknown");
    assert.equal(item.acceptanceMet, 3);
    assert.equal(item.parentIssue.number, 42);
    assert.deepEqual(item.children, []);
    assert.deepEqual(item.orphans, []);
  });

  it("surfaces parse errors as invalid list rows", () => {
    const item = toListItem({ ok: false, id: "x", error: "JSON inválido" });
    assert.equal(item.valid, false);
    assert.equal(item.tokensTotal, null);
    assert.equal(item.ciStatus, "unknown");
  });
});

describe("resolveAgentGraph", () => {
  it("lists only childIds that exist and treats missing parent.childIds as orphan", () => {
    const graph = resolveAgentGraph({
      agents: [
        {
          id: "parent",
          kind: "parent",
          childIds: ["tdd-43", "ghost-1"],
        },
        {
          id: "tdd-43",
          kind: "subagent",
          parentId: "parent",
          ticketIssue: 43,
        },
        {
          id: "research-1",
          kind: "subagent",
          parentId: "parent",
        },
        {
          id: "code-review-1",
          kind: "subagent",
        },
      ],
    });
    assert.equal(graph.parent.id, "parent");
    assert.deepEqual(
      graph.children.map((a) => a.id),
      ["tdd-43"]
    );
    assert.deepEqual(
      graph.orphans.map((a) => a.id),
      ["research-1"]
    );
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
      writeFileSync(
        join(dir, "2026-10-02T130000Z-99.json"),
        JSON.stringify({
          ...validRun,
          parentIssue: { number: 99, title: "Otra", url: "https://example.com/99" },
          agents: [
            {
              id: "parent",
              kind: "parent",
              role: "orchestrator",
              childIds: ["tdd-100"],
            },
            {
              id: "tdd-100",
              kind: "subagent",
              parentId: "parent",
              ticketIssue: 100,
            },
            {
              id: "research-1",
              kind: "subagent",
              parentId: "parent",
            },
          ],
        })
      );

      const listed = listRuns(dir);
      assert.equal(listed.length, 3);
      const good = listed.find((r) => r.id === "2026-10-02T125900Z-42");
      const withKids = listed.find((r) => r.id === "2026-10-02T130000Z-99");
      const bad = listed.find((r) => r.id === "bad");
      assert.equal(good.valid, true);
      assert.equal(good.tokensTotal, null);
      assert.deepEqual(good.children, []);
      assert.deepEqual(good.orphans, []);
      assert.deepEqual(
        withKids.children.map((c) => c.agentId),
        ["tdd-100"]
      );
      assert.equal(withKids.children[0].parentAgentId, "parent");
      assert.equal(withKids.children[0].ciStatus, undefined);
      assert.deepEqual(
        withKids.orphans.map((c) => c.agentId),
        ["research-1"]
      );
      assert.equal(bad.valid, false);

      const detail = getRun(dir, "2026-10-02T125900Z-42");
      assert.equal(detail.modelTitle, "Claude Sonnet 4.6");
      assert.equal(detail.data.branch, "feat/42-slug");
      assert.ok(Array.isArray(detail.timeline));
      assert.ok(detail.timeline.length > 0);
      assert.equal(detail.cost.totalUsd, null);
      assert.equal(detail.cost.coverage, "unknown");

      const missing = getRun(dir, "nope");
      assert.equal(missing.ok, false);
      assert.equal(missing.status, 404);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("normalizeCountMap", () => {
  it("flattens skill objects to counts", () => {
    assert.deepEqual(
      normalizeCountMap({
        tdd: { loaded: 1, completed: 2 },
        Shell: 4,
      }),
      { tdd: 3, Shell: 4 }
    );
  });
});

describe("resolveTimeline", () => {
  it("uses explicit timeline when present", () => {
    const tl = resolveTimeline({
      timeline: [
        {
          at: "2026-10-02T12:00:00.000Z",
          step: "grill",
          status: "done",
          label: "Grill",
        },
      ],
    });
    assert.equal(tl.length, 1);
    assert.equal(tl[0].step, "grill");
  });

  it("derives a coarse timeline when missing", () => {
    const tl = resolveTimeline(validRun);
    assert.ok(tl.some((e) => e.step === "ci" && e.status === "done"));
    assert.ok(tl.some((e) => e.step === "pr" && e.status === "done"));
  });
});

describe("observabilityCounts", () => {
  it("counts open failures and open feedback", () => {
    const counts = observabilityCounts({
      phases: [{ id: "grill" }],
      agents: [{ id: "parent" }, { id: "tdd" }],
      traces: { sessionId: "abc" },
      feedback: [{ status: "open" }, { status: "fixed" }],
      evidence: [{ kind: "test" }],
      failures: [{ resolved: false }, { resolved: true }],
    });
    assert.equal(counts.phases, 1);
    assert.equal(counts.agents, 2);
    assert.equal(counts.traces, 1);
    assert.equal(counts.feedback, 2);
    assert.equal(counts.feedbackOpen, 1);
    assert.equal(counts.evidence, 1);
    assert.equal(counts.failures, 2);
    assert.equal(counts.failuresOpen, 1);
  });

  it("treats missing arrays as empty", () => {
    const counts = observabilityCounts({});
    assert.equal(counts.failuresOpen, 0);
    assert.equal(counts.traces, 0);
  });
});

describe("mergeUnifiedTimeline", () => {
  it("merges steps, phases, agents, feedback, evidence and failures", () => {
    const events = mergeUnifiedTimeline({
      recordedAt: "2026-10-02T12:59:00.000Z",
      timeline: [
        {
          at: "2026-10-02T12:50:00.000Z",
          step: "grill",
          status: "done",
          label: "Grill",
        },
      ],
      phases: [
        {
          id: "grill",
          label: "Grill",
          status: "done",
          startedAt: "2026-10-02T12:50:00.000Z",
          checks: [
            {
              id: "shared",
              label: "Entendimiento",
              status: "pass",
              at: "2026-10-02T12:51:00.000Z",
            },
          ],
        },
      ],
      agents: [
        {
          id: "parent",
          role: "orchestrator",
          startedAt: "2026-10-02T12:49:00.000Z",
          status: "running",
        },
      ],
      feedback: [
        {
          at: "2026-10-02T12:56:00.000Z",
          source: "code-review-spec",
          summary: "hueco",
          status: "open",
          severity: "high",
        },
      ],
      evidence: [
        {
          at: "2026-10-02T12:57:00.000Z",
          kind: "test",
          label: "yarn test",
          result: "pass",
        },
      ],
      failures: [
        {
          at: "2026-10-02T12:57:10.000Z",
          kind: "lint",
          summary: "eslint",
          resolved: false,
          attempts: 1,
        },
      ],
    });
    const kinds = new Set(events.map((e) => e.kind));
    assert.ok(kinds.has("step"));
    assert.ok(kinds.has("phase"));
    assert.ok(kinds.has("check"));
    assert.ok(kinds.has("agent"));
    assert.ok(kinds.has("feedback"));
    assert.ok(kinds.has("evidence"));
    assert.ok(kinds.has("failure"));
    const times = events.map((e) => e.at).filter(Boolean);
    const sorted = [...times].sort();
    assert.deepEqual(times, sorted);
  });

  it("filters by kind", () => {
    const events = mergeUnifiedTimeline({
      timeline: [{ at: "2026-10-02T12:00:00.000Z", step: "grill", status: "done", label: "Grill" }],
      failures: [{ at: "2026-10-02T12:01:00.000Z", kind: "lint", summary: "boom", resolved: false }],
    });
    const onlyFail = filterUnifiedTimeline(events, ["failure"]);
    assert.equal(onlyFail.length, 1);
    assert.equal(onlyFail[0].kind, "failure");
    assert.equal(filterUnifiedTimeline(events, []).length, 0);
  });

  it("carries costUsd on timeline steps and agents", () => {
    const events = mergeUnifiedTimeline({
      timeline: [
        {
          at: "2026-10-02T12:00:00.000Z",
          step: "grill",
          status: "done",
          label: "Grill",
          costUsd: 0.12,
        },
        {
          at: "2026-10-02T12:01:00.000Z",
          step: "spec",
          status: "done",
          label: "Spec",
          costUsd: null,
        },
      ],
      agents: [
        {
          id: "tdd-43",
          role: "implement",
          startedAt: "2026-10-02T12:02:00.000Z",
          status: "done",
          costUsd: 0.4,
        },
      ],
    });
    const grill = events.find((e) => e.kind === "step" && e.step === "grill");
    const spec = events.find((e) => e.kind === "step" && e.step === "spec");
    const agent = events.find((e) => e.kind === "agent");
    assert.equal(grill.costUsd, 0.12);
    assert.equal(spec.costUsd, null);
    assert.equal(agent.costUsd, 0.4);
  });

  it("prices a step from tokensDelta when costUsd is missing", () => {
    const events = mergeUnifiedTimeline({
      model: "claude-sonnet-4-6",
      timeline: [
        {
          at: "2026-10-02T12:00:00.000Z",
          step: "grill",
          status: "done",
          label: "Grill",
          tokensDelta: {
            input: 1_000_000,
            output: 0,
            cachedInput: 0,
            cacheWriteInput: 0,
          },
        },
      ],
    });
    assert.equal(events[0].costUsd, 3);
  });
});

describe("resolveRunCost", () => {
  it("keeps unknown cost as null instead of zero", () => {
    const cost = resolveRunCost({});
    assert.equal(cost.totalUsd, null);
    assert.equal(cost.subtotalUsd, null);
    assert.equal(cost.coverage, "unknown");
  });

  it("rounds captured USD to two decimals", () => {
    const cost = resolveRunCost({
      cost: { totalUsd: null, subtotalUsd: 2.244802, coverage: "partial", source: "rate-card" },
    });
    assert.equal(cost.subtotalUsd, 2.24);
  });

  it("uses explicit cost on the run", () => {
    const cost = resolveRunCost({
      cost: { totalUsd: 1.5, subtotalUsd: 1.5, coverage: "complete", source: "trace", kind: "api-equivalent" },
    });
    assert.equal(cost.totalUsd, 1.5);
    assert.equal(cost.subtotalUsd, 1.5);
    assert.equal(cost.coverage, "complete");
    assert.equal(cost.source, "trace");
  });

  it("falls back to traceMetadata.apiCost", () => {
    const cost = resolveRunCost({
      traceMetadata: { apiCost: { totalUsd: null, subtotalUsd: 0.25, basis: "api-equivalent" } },
    });
    assert.equal(cost.totalUsd, null);
    assert.equal(cost.subtotalUsd, 0.25);
    assert.equal(cost.coverage, "partial");
    assert.equal(cost.source, "trace");
    assert.equal(cost.kind, "api-equivalent");
  });

  it("ignores per-step costs; only the full-run estimate counts", () => {
    const cost = resolveRunCost({
      timeline: [
        { step: "grill", costUsd: 0.1 },
        { step: "spec", costUsd: null },
      ],
      agents: [{ id: "parent", costUsd: 0.05 }],
    });
    assert.equal(cost.totalUsd, null);
    assert.equal(cost.subtotalUsd, null);
    assert.equal(cost.coverage, "unknown");
  });

  it("estimates parent-only USD from tokens and Cursor list price", () => {
    const cost = resolveRunCost({
      model: "claude-sonnet-4-6",
      tokens: {
        values: {
          input: 1_000_000,
          output: 1_000_000,
          cachedInput: 0,
          cacheWriteInput: 0,
        },
      },
    });
    assert.equal(cost.totalUsd, null);
    assert.equal(cost.subtotalUsd, 18);
    assert.equal(cost.coverage, "partial");
    assert.equal(cost.source, "rate-card");
  });
});

describe("getRun hook overlay", () => {
  it("prices parent-only subtotal from Cursor hook turns", () => {
    const runsDir = mkdtempSync(join(tmpdir(), "deliver-runs-"));
    const usageHome = mkdtempSync(join(tmpdir(), "deliver-cursor-"));
    const sessionId = "sess-hook";
    writeFileSync(
      join(runsDir, "2026-10-03T120000Z-1.json"),
      JSON.stringify({
        ...validRun,
        traces: { sessionId },
      })
    );
    const folder = join(
      usageHome,
      "ai-hub-usage",
      createHash("sha256").update(sessionId).digest("hex")
    );
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      join(folder, "g.json"),
      JSON.stringify({
        conversationId: sessionId,
        generationId: "g1",
        model: "claude-sonnet-4-6",
        recordedAt: "2026-10-03T12:01:00.000Z",
        values: {
          input: 1_000_000,
          output: 1_000_000,
          cachedInput: 0,
          cacheWriteInput: 0,
          total: 2_000_000,
        },
      })
    );
    const result = getRun(runsDir, "2026-10-03T120000Z-1", usageHome);
    assert.equal(result.ok, true);
    assert.equal(result.data.tokens.coverage, "hook");
    assert.equal(result.data.tokens.values.total, 2_000_000);
    assert.equal(result.cost.totalUsd, null);
    assert.equal(result.cost.subtotalUsd, 18);
    rmSync(runsDir, { recursive: true, force: true });
    rmSync(usageHome, { recursive: true, force: true });
  });
});
