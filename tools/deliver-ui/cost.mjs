/**
 * Cursor list-price USD (per million tokens). Not a subscription invoice.
 * Source: https://cursor.com/docs/models-and-pricing (consulted 2026-10-03).
 * Unknown model or missing counters → null. Never invent a 0.
 */

export const PRICE_DATE = "2026-10-03";
export const PRICE_SOURCE = "https://cursor.com/docs/models-and-pricing";

/** @typedef {{ input: number, cacheWrite: number | null, cacheRead: number, output: number, firstParty: boolean }} Rate */

/** @type {Record<string, Rate>} */
export const RATES = {
  "claude-sonnet-4.6": { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15, firstParty: false },
  "claude-sonnet-4.5": { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15, firstParty: false },
  "claude-sonnet-4": { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15, firstParty: false },
  "claude-opus-4.6": { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25, firstParty: false },
  "claude-haiku-4.5": { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5, firstParty: false },
  "composer-2.5": { input: 0.5, cacheWrite: null, cacheRead: 0.2, output: 2.5, firstParty: true },
  "composer-2.5-fast": { input: 3, cacheWrite: null, cacheRead: 0.5, output: 15, firstParty: true },
};

/**
 * @param {unknown} model
 * @returns {string | null}
 */
export function normalizeModelId(model) {
  if (typeof model !== "string" || !model.trim()) return null;
  let id = model.trim().toLowerCase().replaceAll("_", "-");
  id = id.replace(/^anthropic\//, "").replace(/^cursor\//, "");
  const aliases = {
    "claude-sonnet-4-6": "claude-sonnet-4.6",
    "claude-4.6-sonnet": "claude-sonnet-4.6",
    "claude-4-6-sonnet": "claude-sonnet-4.6",
    "claude-sonnet-4.6": "claude-sonnet-4.6",
    "claude-sonnet-4-5": "claude-sonnet-4.5",
    "claude-4.5-sonnet": "claude-sonnet-4.5",
    "claude-sonnet-4.5": "claude-sonnet-4.5",
    "claude-4-sonnet": "claude-sonnet-4",
    "claude-sonnet-4": "claude-sonnet-4",
    "claude-opus-4-6": "claude-opus-4.6",
    "claude-4.6-opus": "claude-opus-4.6",
    "claude-haiku-4-5": "claude-haiku-4.5",
    "claude-4.5-haiku": "claude-haiku-4.5",
    "composer-2-5": "composer-2.5",
    "composer-2.5": "composer-2.5",
    "composer-2.5-fast": "composer-2.5-fast",
    "composer-2-5-fast": "composer-2.5-fast",
  };
  return aliases[id] || (RATES[id] ? id : null);
}

/**
 * Capture USD as cents. Missing stays null. Never invent a 0.
 * @param {unknown} amount
 * @returns {number | null}
 */
export function roundUsd(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

const VERSION_PART = /^\d+(?:\.\d+)*$/;

/**
 * Display title: "claude-sonnet-4-6" → "Claude Sonnet 4.6".
 * @param {unknown} model
 * @returns {string}
 */
export function formatModelTitle(model) {
  if (typeof model !== "string" || !model.trim()) return "modelo desconocido";
  let id = normalizeModelId(model);
  if (!id) {
    id = model.trim().toLowerCase().replaceAll("_", "-");
    id = id.replace(/^anthropic\//, "").replace(/^cursor\//, "");
  }
  const parts = id.split("-").filter(Boolean);
  const words = [];
  for (let i = 0; i < parts.length; ) {
    if (VERSION_PART.test(parts[i])) {
      const nums = [parts[i]];
      i += 1;
      while (i < parts.length && VERSION_PART.test(parts[i])) {
        nums.push(parts[i]);
        i += 1;
      }
      words.push(nums.join("."));
      continue;
    }
    const part = parts[i];
    words.push(part.charAt(0).toUpperCase() + part.slice(1));
    i += 1;
  }
  return words.join(" ") || "modelo desconocido";
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function tokenCount(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * @param {unknown} model
 * @param {object | null | undefined} values
 * @param {{ cursorTokenRate?: number }} [opts]
 * @returns {{ amountUsd: number, rateId: string, source: string, priceDate: string } | null}
 */
export function estimateCostUsd(model, values, opts = {}) {
  const rateId = normalizeModelId(model);
  if (!rateId || !values || typeof values !== "object") return null;
  const rate = RATES[rateId];
  if (!rate) return null;

  const input = tokenCount(values.input);
  const output = tokenCount(values.output);
  const cachedInput = tokenCount(values.cachedInput);
  const cacheWriteInput = tokenCount(values.cacheWriteInput);
  if (input === null || output === null || cachedInput === null) return null;

  const write = cacheWriteInput === null ? 0 : cacheWriteInput;
  if (rate.cacheWrite === null && write > 0) return null;
  if (input < cachedInput + write) return null;

  const uncached = input - cachedInput - write;
  const writeRate = rate.cacheWrite === null ? 0 : rate.cacheWrite;
  const modelUsd =
    (uncached * rate.input +
      cachedInput * rate.cacheRead +
      write * writeRate +
      output * rate.output) /
    1_000_000;

  const extraRate =
    typeof opts.cursorTokenRate === "number" && !rate.firstParty ? opts.cursorTokenRate : 0;
  const extraUsd = extraRate > 0 ? ((input + output) * extraRate) / 1_000_000 : 0;
  const amountUsd = roundUsd(modelUsd + extraUsd);
  return {
    amountUsd,
    rateId,
    source: PRICE_SOURCE,
    priceDate: PRICE_DATE,
  };
}
