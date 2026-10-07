import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractComposerSettings,
  formatSessionTelemetry,
  summarizeContextUsage,
} from "./session-settings.mjs";

describe("extractComposerSettings", () => {
  it("reads effort and context size from composerData", () => {
    const settings = extractComposerSettings({
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
    });
    assert.deepEqual(settings, {
      effort: "medium",
      maxMode: false,
      fast: false,
      contextTokensUsed: 116745,
      contextTokenLimit: 256000,
      contextUsagePercent: 45.6,
    });
    assert.equal(JSON.stringify(settings).includes("PRIVATE"), false);
  });
});

describe("summarizeContextUsage", () => {
  it("keeps peak/last null when no inputs", () => {
    assert.deepEqual(summarizeContextUsage([]), { peakInputTokens: null, lastInputTokens: null });
  });
});

describe("formatSessionTelemetry", () => {
  it("renders effort and context without inventing zeros", () => {
    assert.equal(
      formatSessionTelemetry(
        {
          effort: "medium",
          maxMode: false,
          fast: false,
          contextTokensUsed: 116745,
          contextTokenLimit: 256000,
          contextUsagePercent: 45.6,
        },
        { peakInputTokens: 692221, lastInputTokens: 667687 }
      ),
      "effort medium · contexto 117k/256k 46% · pico input 692k · último 668k"
    );
    assert.equal(formatSessionTelemetry(null, null), null);
  });
});
