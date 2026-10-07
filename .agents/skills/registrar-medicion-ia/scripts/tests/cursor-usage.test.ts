import { expect, test } from "bun:test";
import { extractComposerSettings, summarizeContextUsage } from "../src/domain/cursor-usage.ts";

const composer = {
  modelConfig: {
    maxMode: false,
    modelName: "grok-4.6",
    selectedModels: [{
      modelId: "grok-4.6",
      parameters: [
        { id: "effort", value: "medium" },
        { id: "fast", value: "false" },
      ],
    }],
  },
  contextTokensUsed: 116745,
  contextTokenLimit: 256000,
  contextUsagePercent: 45.603515625,
  prompt: "PRIVATE",
};

test("extracts effort and context size from composerData without private text", () => {
  const settings = extractComposerSettings(composer);
  expect(settings).toEqual({
    effort: "medium",
    maxMode: false,
    fast: false,
    contextTokensUsed: 116745,
    contextTokenLimit: 256000,
    contextUsagePercent: 45.603515625,
  });
  expect(JSON.stringify(settings)).not.toContain("PRIVATE");
});

test("leaves effort and context unknown rather than inventing zeros", () => {
  expect(extractComposerSettings({})).toEqual({
    effort: null,
    maxMode: null,
    fast: null,
    contextTokensUsed: null,
    contextTokenLimit: null,
    contextUsagePercent: null,
  });
  expect(extractComposerSettings({ contextTokensUsed: -1, contextTokenLimit: 1.5 })).toEqual({
    effort: null,
    maxMode: null,
    fast: null,
    contextTokensUsed: null,
    contextTokenLimit: null,
    contextUsagePercent: null,
  });
});

test("summarizes peak and last observed input, never inventing zero", () => {
  expect(summarizeContextUsage([])).toEqual({ peakInputTokens: null, lastInputTokens: null });
  expect(summarizeContextUsage([
    { values: { input: null } },
    { values: { input: 692221 } },
    { values: { input: 667687 } },
  ])).toEqual({ peakInputTokens: 692221, lastInputTokens: 667687 });
});
