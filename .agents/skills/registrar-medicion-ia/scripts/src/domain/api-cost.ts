import type { TokenUsage } from "./model.ts";

export interface TokenCall {
  sessionId?: string;
  messageIndex: number;
  model: string | null;
  timestamp: string | null;
  values: TokenUsage;
}

// Referencia API Standard en USD, no facturación de la suscripción de Codex.
const rates = {
  "gpt-6-astra": { input: 10, cachedInput: 1, cacheWriteInput: 12.5, output: 50 },
  "gpt-6-luna": { input: 0.1, cachedInput: 0.01, cacheWriteInput: 0.125, output: 0.5 },
  "gpt-6-sol": { input: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 10 },
} satisfies Record<string, { input: number; cachedInput: number; cacheWriteInput: number; output: number }>;

export function estimateApiCost(calls: TokenCall[], missingSlices: number) {
  const rows = calls.map((call) => {
    const base = call.model === "gpt-6-sol" || call.model === "gpt-6-astra" || call.model === "gpt-6-luna" ? rates[call.model] : null;
    const { input, cachedInput, output } = call.values;
    // Codex omite cache_write_input_tokens cuando no hay escrituras registradas.
    const cacheWriteInput = call.values.cacheWriteInput ?? 0;
    const complete = input !== null && cachedInput !== null && output !== null
      && input >= cachedInput + cacheWriteInput && [input, cachedInput, cacheWriteInput, output].every((n) => Number.isSafeInteger(n) && n >= 0);
    const longContext = input !== null && input > 272_000;
    const prices = base ? {
      input: base.input * (longContext ? 2 : 1),
      cachedInput: base.cachedInput * (longContext ? 2 : 1),
      cacheWriteInput: base.cacheWriteInput * (longContext ? 2 : 1),
      output: base.output * (longContext ? 1.5 : 1),
    } : null;
    const tokens = complete ? { input: input - cachedInput - cacheWriteInput, cachedInput, cacheWriteInput, output } : null;
    const amountUsd = prices && tokens ? (tokens.input * prices.input + tokens.cachedInput * prices.cachedInput + tokens.cacheWriteInput * prices.cacheWriteInput + tokens.output * prices.output) / 1_000_000 : null;
    return { sessionId: call.sessionId ?? null, model: call.model ?? "unknown", timestamp: call.timestamp, messageIndex: call.messageIndex, longContext, tokens, prices, amountUsd };
  });
  const pricedCalls = rows.filter((row) => row.amountUsd !== null).length;
  const subtotalUsd = rows.reduce((sum, row) => sum + (row.amountUsd ?? 0), 0);
  const complete = rows.length > 0 && pricedCalls === rows.length && missingSlices === 0;
  return {
    version: "1" as const,
    basis: "api-equivalent" as const,
    currency: "USD" as const,
    pricingTier: "standard" as const,
    priceDate: "2026-09-25",
    sources: [...new Set(rows.filter((row) => row.prices !== null).map((row) => `https://developers.openai.com/api/docs/models/${row.model}`))],
    totalUsd: complete ? subtotalUsd : null,
    subtotalUsd,
    pricedCalls,
    totalCalls: rows.length,
    missingSlices,
    assumptions: ["Equivalente API Standard; no es un cargo de suscripción.", "Sin recargos regionales, Fast, Batch/Flex ni herramientas facturables.", "Escrituras de caché ausentes en Codex se consideran cero; reasoning ya está incluido en output."],
    rows,
  };
}

export type ApiCost = ReturnType<typeof estimateApiCost>;
