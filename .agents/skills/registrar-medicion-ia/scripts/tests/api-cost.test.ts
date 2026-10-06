import { expect, test } from "bun:test";
import { estimateApiCost, type TokenCall } from "../src/domain/api-cost.ts";
import { buildTaskTrace } from "../src/application/build-task-trace.ts";

const call: TokenCall = { model: "gpt-6-sol", messageIndex: 0, timestamp: "2026-09-25T10:00:00Z", values: { input: 1000, cachedInput: 800, cacheWriteInput: 0, output: 100, reasoningOutput: 50, total: 1100 } };

test("separates cached input and does not bill reasoning twice", () => {
  expect(estimateApiCost([call], 0).totalUsd).toBeCloseTo(0.00156, 10);
});
test("prices long context per request, not by session total", () => {
  const short = { ...call, values: { ...call.values, input: 200_000, cachedInput: 0, output: 100 } };
  expect(estimateApiCost([short, short], 0).totalUsd).toBeCloseTo(0.802, 10);
  const long = { ...call, values: { ...call.values, input: 300_000, cachedInput: 200_000, output: 100 } };
  expect(estimateApiCost([long], 0).totalUsd).toBeCloseTo(0.4815, 10);
});
test("unknown prices or incomplete traces produce unknown total, never zero", () => {
  const unknown = { ...call, model: "future-model" };
  expect(estimateApiCost([call, unknown], 0)).toMatchObject({ totalUsd: null, pricedCalls: 1, totalCalls: 2, subtotalUsd: 0.00156 });
  expect(estimateApiCost([call], 1).totalUsd).toBeNull();
  expect(estimateApiCost([], 1).totalUsd).toBeNull();
  expect(estimateApiCost([{ ...call, values: { ...call.values, input: null } }], 0).totalUsd).toBeNull();
});
test("prices only selected messages and rejects overlapping task slices", () => {
  const report = { harness: "codex", sessions: [{ sessionId: "s", tokenCalls: [call, { ...call, messageIndex: 1 }] }] };
  const slice = { harness: "codex" as const, sessionId: "s", fromMessage: 1, toMessage: 1 };
  expect(buildTaskTrace({ report, slices: [slice] }).apiCost?.totalCalls).toBe(1);
  expect(() => buildTaskTrace({ report, slices: [slice, slice] })).toThrow("solaparse");
});
