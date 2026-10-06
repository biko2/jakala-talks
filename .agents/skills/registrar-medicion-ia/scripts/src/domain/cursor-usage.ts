import type { TokenUsage } from "./model.ts";
import { asRecord } from "../shared/unknown.ts";

export interface CursorTurnUsage {
  generationId: string;
  model: string | null;
  recordedAt: string;
  values: TokenUsage;
}
export interface CursorUsage {
  scope: "whole-session";
  agentScope: "parent-only";
  transcriptTurns: number;
  turns: CursorTurnUsage[];
}
function counter(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
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
