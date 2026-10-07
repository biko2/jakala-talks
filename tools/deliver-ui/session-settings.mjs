import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Allowlisted Cursor session settings. No prompts, no file contents.
 * null = unknown. Never invent a 0.
 */

const SAFE_SESSION_ID = /^[A-Za-z0-9._:-]+$/;

export function composerDatabasePath(cursorHome) {
  if (!cursorHome) return null;
  return join(
    dirname(cursorHome),
    "Library",
    "Application Support",
    "Cursor",
    "User",
    "globalStorage",
    "state.vscdb"
  );
}

export function readComposerData(cursorHome, sessionId) {
  const db = composerDatabasePath(cursorHome);
  if (!db || !existsSync(db) || !SAFE_SESSION_ID.test(sessionId || "")) return null;
  try {
    const result = spawnSync(
      "sqlite3",
      ["-readonly", db, `SELECT value FROM cursorDiskKV WHERE key = 'composerData:${sessionId}'`],
      { encoding: "utf8", timeout: 2000 }
    );
    const raw = result.stdout?.trim();
    if (result.status !== 0 || !raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function emptySessionSettings() {
  return {
    effort: null,
    maxMode: null,
    fast: null,
    contextTokensUsed: null,
    contextTokenLimit: null,
    contextUsagePercent: null,
  };
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function nonNegativeInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function nonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function parameterValue(selected, modelName, id) {
  const preferred = selected.find((item) => asRecord(item).modelId === modelName) ?? selected[0];
  const parameters = Array.isArray(asRecord(preferred).parameters) ? asRecord(preferred).parameters : [];
  const match = parameters.find((item) => asRecord(item).id === id);
  return match ? asRecord(match).value : undefined;
}

export function extractComposerSettings(value) {
  const data = asRecord(value);
  const modelConfig = asRecord(data.modelConfig);
  const selected = Array.isArray(modelConfig.selectedModels) ? modelConfig.selectedModels : [];
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

export function extractHookSettings(value) {
  const event = asRecord(value);
  const nested = extractComposerSettings(event.model_config ?? event.modelConfig ?? event);
  const effort = nested.effort ?? asString(event.effort);
  return {
    effort: effort && effort.length <= 32 ? effort : null,
    maxMode: nested.maxMode ?? asBoolean(event.max_mode ?? event.maxMode),
    fast: nested.fast ?? asBoolean(event.fast),
    contextTokensUsed: nested.contextTokensUsed ?? nonNegativeInt(event.context_tokens_used ?? event.contextTokensUsed),
    contextTokenLimit:
      nested.contextTokenLimit ??
      nonNegativeInt(event.context_token_limit ?? event.contextTokenLimit ?? event.context_window),
    contextUsagePercent:
      nested.contextUsagePercent ?? nonNegativeNumber(event.context_usage_percent ?? event.contextUsagePercent),
  };
}

export function mergeSessionSettings(primary, fallback) {
  const a = primary && typeof primary === "object" ? primary : emptySessionSettings();
  const b = fallback && typeof fallback === "object" ? fallback : emptySessionSettings();
  return {
    effort: a.effort ?? b.effort ?? null,
    maxMode: a.maxMode ?? b.maxMode ?? null,
    fast: a.fast ?? b.fast ?? null,
    contextTokensUsed: a.contextTokensUsed ?? b.contextTokensUsed ?? null,
    contextTokenLimit: a.contextTokenLimit ?? b.contextTokenLimit ?? null,
    contextUsagePercent: a.contextUsagePercent ?? b.contextUsagePercent ?? null,
  };
}

export function hasSessionSettings(settings) {
  return Object.values(settings || {}).some((value) => value !== null && value !== undefined);
}

export function summarizeContextUsage(turns) {
  if (!Array.isArray(turns)) return { peakInputTokens: null, lastInputTokens: null };
  const inputs = turns
    .map((turn) => turn?.values?.input)
    .filter((n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
  if (inputs.length === 0) return { peakInputTokens: null, lastInputTokens: null };
  return { peakInputTokens: Math.max(...inputs), lastInputTokens: inputs[inputs.length - 1] };
}

export function formatContextTokens(n) {
  if (n === null || n === undefined) return null;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function formatSessionTelemetry(settings, contextUsage) {
  const parts = [];
  if (settings?.effort) parts.push(`effort ${settings.effort}`);
  if (settings?.maxMode === true) parts.push("max mode");
  if (settings?.fast === true) parts.push("fast");
  const used = settings?.contextTokensUsed;
  const limit = settings?.contextTokenLimit;
  if (used != null && limit != null) {
    const pct =
      settings.contextUsagePercent != null
        ? ` ${Math.round(settings.contextUsagePercent)}%`
        : "";
    parts.push(`contexto ${formatContextTokens(used)}/${formatContextTokens(limit)}${pct}`);
  } else if (used != null) {
    parts.push(`contexto ${formatContextTokens(used)}`);
  }
  const peak = contextUsage?.peakInputTokens;
  const last = contextUsage?.lastInputTokens;
  if (peak != null) parts.push(`pico input ${formatContextTokens(peak)}`);
  if (last != null && last !== peak) parts.push(`último ${formatContextTokens(last)}`);
  return parts.join(" · ") || null;
}
