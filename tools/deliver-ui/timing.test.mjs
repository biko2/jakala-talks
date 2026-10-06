import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDuration, resolveRunTiming } from "./timing.mjs";

describe("formatDuration", () => {
  it("keeps unknown as null text for the UI helper", () => {
    assert.equal(formatDuration(null), null);
    assert.equal(formatDuration(undefined), null);
  });

  it("formats a known 9 minute span", () => {
    assert.equal(formatDuration(9 * 60 * 1000 + 12 * 1000), "9m 12s");
    assert.equal(formatDuration(3 * 60 * 60 * 1000 + 5 * 60 * 1000), "3h 05m");
    assert.equal(formatDuration(0), "0s");
  });
});

describe("resolveRunTiming", () => {
  it("keeps duration null when timestamps are missing", () => {
    const timing = resolveRunTiming({});
    assert.equal(timing.startedAt, null);
    assert.equal(timing.endedAt, null);
    assert.equal(timing.durationMs, null);
    assert.equal(timing.coverage, "unknown");
  });

  it("uses explicit timing when present", () => {
    const timing = resolveRunTiming({
      timing: {
        startedAt: "2026-10-02T12:50:00.000Z",
        endedAt: "2026-10-02T12:59:00.000Z",
        durationMs: 540000,
      },
    });
    assert.equal(timing.durationMs, 540000);
    assert.equal(timing.coverage, "complete");
    assert.equal(timing.source, "explicit");
  });

  it("derives wall clock from timeline and phases without inventing zero", () => {
    const timing = resolveRunTiming({
      timeline: [
        { at: "2026-10-02T12:50:00.000Z", step: "mode" },
        { at: "2026-10-02T12:59:00.000Z", step: "measure" },
      ],
      phases: [
        {
          id: "grill",
          startedAt: "2026-10-02T12:50:00.000Z",
          endedAt: "2026-10-02T12:52:00.000Z",
        },
      ],
    });
    assert.equal(timing.startedAt, "2026-10-02T12:50:00.000Z");
    assert.equal(timing.endedAt, "2026-10-02T12:59:00.000Z");
    assert.equal(timing.durationMs, 9 * 60 * 1000);
    assert.equal(timing.coverage, "partial");
    assert.equal(timing.source, "events");
  });

  it("marks complete when the parent agent has ended", () => {
    const timing = resolveRunTiming({
      agents: [
        {
          id: "parent",
          kind: "parent",
          startedAt: "2026-10-02T12:50:00.000Z",
          endedAt: "2026-10-02T13:10:00.000Z",
          status: "done",
        },
      ],
    });
    assert.equal(timing.durationMs, 20 * 60 * 1000);
    assert.equal(timing.coverage, "complete");
  });

  it("subtracts recorded human waits from derived wall clock", () => {
    const timing = resolveRunTiming({
      timing: {
        startedAt: "2026-10-02T12:50:00.000Z",
        endedAt: "2026-10-02T13:00:00.000Z",
      },
      humanWaits: [
        {
          gate: "grill",
          startedAt: "2026-10-02T12:52:00.000Z",
          endedAt: "2026-10-02T12:55:00.000Z",
        },
      ],
    });
    assert.equal(timing.durationMs, 7 * 60 * 1000);
    assert.equal(timing.humanWaitMs, 3 * 60 * 1000);
  });

  it("pairs timeline human-wait started/done and merges overlap", () => {
    const timing = resolveRunTiming({
      timeline: [
        { at: "2026-10-02T12:50:00.000Z", step: "mode", status: "done" },
        { at: "2026-10-02T12:51:00.000Z", step: "human-wait", status: "started" },
        { at: "2026-10-02T12:54:00.000Z", step: "human-wait", status: "done" },
        { at: "2026-10-02T12:53:00.000Z", step: "human-wait", status: "started" },
        { at: "2026-10-02T12:56:00.000Z", step: "human-wait", status: "done" },
        { at: "2026-10-02T12:59:00.000Z", step: "measure", status: "done" },
      ],
    });
    assert.equal(timing.durationMs, 4 * 60 * 1000);
    assert.equal(timing.humanWaitMs, 5 * 60 * 1000);
  });

  it("keeps explicit durationMs as active time and still reports waits", () => {
    const timing = resolveRunTiming({
      timing: {
        startedAt: "2026-10-02T12:50:00.000Z",
        endedAt: "2026-10-02T13:00:00.000Z",
        durationMs: 420000,
      },
      humanWaits: [
        {
          gate: "spec",
          startedAt: "2026-10-02T12:55:00.000Z",
          endedAt: "2026-10-02T12:58:00.000Z",
        },
      ],
    });
    assert.equal(timing.durationMs, 420000);
    assert.equal(timing.humanWaitMs, 3 * 60 * 1000);
  });
});
