import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateCostUsd, formatModelTitle, normalizeModelId } from "./cost.mjs";

describe("normalizeModelId", () => {
  it("maps Cursor slugs to the rate card", () => {
    assert.equal(normalizeModelId("claude-sonnet-4-6"), "claude-sonnet-4.6");
    assert.equal(normalizeModelId("Composer-2.5"), "composer-2.5");
    assert.equal(normalizeModelId("mystery-model"), null);
  });
});

describe("formatModelTitle", () => {
  it("renders Claude Sonnet 4.6 from Cursor slugs", () => {
    assert.equal(formatModelTitle("claude-sonnet-4-6"), "Claude Sonnet 4.6");
    assert.equal(formatModelTitle("claude-sonnet-4.6"), "Claude Sonnet 4.6");
  });

  it("keeps unknown models readable and never invents a name", () => {
    assert.equal(formatModelTitle("grok-4.6"), "Grok 4.6");
    assert.equal(formatModelTitle("composer-2.5-fast"), "Composer 2.5 Fast");
    assert.equal(formatModelTitle(""), "modelo desconocido");
    assert.equal(formatModelTitle(null), "modelo desconocido");
  });
});

describe("estimateCostUsd", () => {
  it("prices 1M uncached in + 1M out on Sonnet 4.6 as $18", () => {
    const got = estimateCostUsd("claude-sonnet-4-6", {
      input: 1_000_000,
      output: 1_000_000,
      cachedInput: 0,
      cacheWriteInput: 0,
    });
    assert.equal(got.amountUsd, 18);
    assert.equal(got.rateId, "claude-sonnet-4.6");
  });

  it("returns null when tokens are missing instead of inventing zero", () => {
    assert.equal(estimateCostUsd("claude-sonnet-4-6", { input: null, output: 10, cachedInput: 0 }), null);
    assert.equal(estimateCostUsd("claude-sonnet-4-6", null), null);
    assert.equal(estimateCostUsd("nope", { input: 1, output: 1, cachedInput: 0 }), null);
  });

  it("rounds captured USD to two decimals", () => {
    const got = estimateCostUsd("claude-sonnet-4-6", {
      input: 748267,
      output: 0,
      cachedInput: 0,
      cacheWriteInput: 0,
    });
    assert.equal(got.amountUsd, 2.24);
  });

  it("uses cache-read rate for cached input", () => {
    const got = estimateCostUsd("claude-sonnet-4-6", {
      input: 1_100_000,
      output: 0,
      cachedInput: 100_000,
      cacheWriteInput: 0,
    });
    assert.equal(got.amountUsd, 3.03);
  });
});
