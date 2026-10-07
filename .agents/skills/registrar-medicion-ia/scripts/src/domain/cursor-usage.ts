import type { TokenUsage } from "./model.ts";
import { asArray, asRecord, asString } from "../shared/unknown.ts";

export interface SessionSettings {
  effort: string | null;
  maxMode: boolean | null;
  fast: boolean | null;
  contextTokensUsed: number | null;
  contextTokenLimit: number | null;
  contextUsagePercent: number | null;
}

export interface ContextUsage {
  peakInputTokens: number | null;
  lastInputTokens: number | null;
}

export function emptySessionSettings(): SessionSettings {
  return {
    effort: null,
    maxMode: null,
    fast: null,
    contextTokensUsed: null,
    contextTokenLimit: null,
    contextUsagePercent: null,
  };
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function parameterValue(selected: unknown[], modelName: string | null, id: string): unknown {
  const preferred = selected.find((item) => asRecord(item).modelId === modelName) ?? selected[0];
  const parameters = asArray(asRecord(preferred).parameters);
  const match = parameters.find((item) => asRecord(item).id === id);
  return match ? asRecord(match).value : undefined;
}

export function extractHookSettings(value: unknown): SessionSettings {
  const event = asRecord(value);
  const nested = extractComposerSettings(event.model_config ?? event.modelConfig ?? event);
  const effort = nested.effort ?? asString(event.effort);
  return {
    effort: effort && effort.length <= 32 ? effort : null,
    maxMode: nested.maxMode ?? asBoolean(event.max_mode ?? event.maxMode),
    fast: nested.fast ?? asBoolean(event.fast),
    contextTokensUsed: nested.contextTokensUsed ?? nonNegativeInt(event.context_tokens_used ?? event.contextTokensUsed),
    contextTokenLimit: nested.contextTokenLimit ?? nonNegativeInt(event.context_token_limit ?? event.contextTokenLimit ?? event.context_window),
    contextUsagePercent: nested.contextUsagePercent ?? nonNegativeNumber(event.context_usage_percent ?? event.contextUsagePercent),
  };
}

export function mergeSessionSettings(primary: SessionSettings, fallback: SessionSettings): SessionSettings {
  return {
    effort: primary.effort ?? fallback.effort,
    maxMode: primary.maxMode ?? fallback.maxMode,
    fast: primary.fast ?? fallback.fast,
    contextTokensUsed: primary.contextTokensUsed ?? fallback.contextTokensUsed,
    contextTokenLimit: primary.contextTokenLimit ?? fallback.contextTokenLimit,
    contextUsagePercent: primary.contextUsagePercent ?? fallback.contextUsagePercent,
  };
}

export function extractComposerSettings(value: unknown): SessionSettings {
  const data = asRecord(value);
  const modelConfig = asRecord(data.modelConfig);
  const selected = asArray(modelConfig.selectedModels);
  const modelName = asString(modelConfig.modelName);
  const effortRaw = asString(parameterValue(selected, modelName, "effort"));
  return {
    effort: effortRaw && effortRaw.length <= 32 ? effortRaw : null,
    maxMode: asBoolean(modelConfig.maxMode),
    fast: asBoolean(parameterValue(selected, modelName, "fast")),
    contextTokensUsed: nonNegativeInt(data.contextTokensUsed),
    contextTokenLimit: nonNegativeInt(data.contextTokenLimit),
    contextUsagePercent: nonNegativeNumber(data.contextUsagePercent),
  };
}

export function summarizeContextUsage(turns: Array<{ values?: { input?: number | null } }>): ContextUsage {
  const inputs = turns.map((turn) => turn.values?.input).filter((n): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
  if (inputs.length === 0) return { peakInputTokens: null, lastInputTokens: null };
  return { peakInputTokens: Math.max(...inputs), lastInputTokens: inputs.at(-1) ?? null };
}

export function hasSessionSettings(settings: SessionSettings): boolean {
  return Object.values(settings).some((value) => value !== null);
}

export interface CursorTurnUsage {
  generationId: string;
  model: string | null;
  recordedAt: string;
  values: TokenUsage;
  settings?: SessionSettings;
}
export interface CursorUsage {
  scope: "whole-session";
  agentScope: "parent-only";
  transcriptTurns: number;
  turns: CursorTurnUsage[];
}
function counter(value: unknown): number | null {
  return nonNegativeInt(value);
}
export function safeCursorValues(value: unknown): TokenUsage {
  const row = asRecord(value);
  const input = counter(row.input);
  const output = counter(row.output);
  return { input, output, cachedInput: counter(row.cachedInput), cacheWriteInput: counter(row.cacheWriteInput), reasoningOutput: null, total: input !== null && output !== null ? counter(input + output) : null };
}

export function sumCursorUsage(turns: CursorTurnUsage[]): TokenUsage {
  const keys = ["input", "output", "cachedInput", "cacheWriteInput", "total", "reasoningOutput"] as const;
  const values: TokenUsage = { input: null, output: null, cachedInput: null, cacheWriteInput: null, total: null, reasoningOutput: null };
  for (const key of keys) {
    const numbers = turns.map(turn => turn.values[key]);
    values[key] = numbers.length && numbers.every(n => n !== null) ? counter(numbers.reduce<number>((sum, n) => sum + (n ?? 0), 0)) : null;
  }
  return values;
}
