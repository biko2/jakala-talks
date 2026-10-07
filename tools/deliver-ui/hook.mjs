import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { estimateCostUsd, roundUsd } from "./cost.mjs";
import {
  emptySessionSettings,
  extractComposerSettings,
  extractHookSettings,
  hasSessionSettings,
  mergeSessionSettings,
  readComposerData,
  summarizeContextUsage,
} from "./session-settings.mjs";

const EMPTY = {
  input: null,
  output: null,
  cachedInput: null,
  cacheWriteInput: null,
  total: null,
  reasoningOutput: null,
};

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function counter(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

/**
 * @param {unknown} value
 */
export function safeHookValues(value) {
  const row = value && typeof value === "object" ? value : {};
  const input = counter(row.input);
  const output = counter(row.output);
  return {
    input,
    output,
    cachedInput: counter(row.cachedInput),
    cacheWriteInput: counter(row.cacheWriteInput),
    reasoningOutput: null,
    total: input !== null && output !== null ? counter(input + output) : null,
  };
}

/**
 * @param {{ values?: object }[]} turns
 */
export function sumHookTurns(turns) {
  if (!Array.isArray(turns) || turns.length === 0) return { ...EMPTY };
  const keys = ["input", "output", "cachedInput", "cacheWriteInput", "total", "reasoningOutput"];
  const values = { ...EMPTY };
  for (const key of keys) {
    const numbers = turns.map((turn) => safeHookValues(turn.values)[key]);
    values[key] =
      numbers.length && numbers.every((n) => n !== null)
        ? counter(numbers.reduce((sum, n) => sum + n, 0))
        : null;
  }
  return values;
}

/**
 * @param {string} sessionId
 */
export function usageFolder(home, sessionId) {
  return join(home, "ai-hub-usage", createHash("sha256").update(sessionId).digest("hex"));
}

/**
 * @param {string} home Cursor home (`~/.cursor`)
 * @param {string} sessionId conversation id
 */
export function readHookTurns(home, sessionId) {
  if (!home || !sessionId) return [];
  const folder = usageFolder(home, sessionId);
  if (!existsSync(folder)) return [];
  const turns = [];
  for (const name of readdirSync(folder)) {
    if (!name.endsWith(".json")) continue;
    try {
      const row = JSON.parse(readFileSync(join(folder, name), "utf8"));
      if (!row || typeof row !== "object") continue;
      if (row.conversationId !== sessionId) continue;
      if (typeof row.generationId !== "string" || typeof row.recordedAt !== "string") continue;
      const settings = extractHookSettings(row.settings ?? {});
      turns.push({
        generationId: row.generationId,
        recordedAt: row.recordedAt,
        model: typeof row.model === "string" ? row.model : null,
        values: safeHookValues(row.values),
        ...(hasSessionSettings(settings) ? { settings } : {}),
      });
    } catch {
      /* corrupt observation is not zero usage */
    }
  }
  return turns.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

const PLACEHOLDER_SESSIONS = new Set(["", "example-session", "pending", "null", "undefined"]);

function sessionIdFromRun(run) {
  const traces = run && run.traces && typeof run.traces === "object" ? run.traces : null;
  if (!traces) return null;
  if (typeof traces.sessionId === "string" && traces.sessionId) return traces.sessionId;
  if (typeof traces.conversationId === "string" && traces.conversationId) return traces.conversationId;
  return null;
}

export function isUsableSessionId(id) {
  return typeof id === "string" && !PLACEHOLDER_SESSIONS.has(id.trim());
}

/**
 * Cursor project folder: /abs/path → slashes become dashes.
 * @param {string} repoRoot
 */
export function defaultTranscriptsDir(repoRoot) {
  if (!repoRoot) return null;
  const slug = repoRoot.replace(/^\//, "").replaceAll("/", "-");
  return join(homedir(), ".cursor", "projects", slug, "agent-transcripts");
}

/**
 * @param {string} transcriptsDir
 * @returns {string[]}
 */
export function listTranscriptIds(transcriptsDir) {
  if (!transcriptsDir || !existsSync(transcriptsDir)) return [];
  return readdirSync(transcriptsDir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => name.slice(0, -6));
}

/**
 * @param {string} home
 * @returns {{ sessionId: string, lastRecordedAt: string }[]}
 */
export function listHookConversations(home) {
  const root = join(home, "ai-hub-usage");
  if (!home || !existsSync(root)) return [];
  /** @type {Map<string, string>} */
  const lastBySession = new Map();
  for (const folderName of readdirSync(root)) {
    const folder = join(root, folderName);
    try {
      if (!statSync(folder).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const name of readdirSync(folder)) {
      if (!name.endsWith(".json")) continue;
      try {
        const row = JSON.parse(readFileSync(join(folder, name), "utf8"));
        if (!row || typeof row !== "object") continue;
        if (typeof row.conversationId !== "string" || typeof row.recordedAt !== "string") continue;
        const prev = lastBySession.get(row.conversationId);
        if (!prev || row.recordedAt > prev) lastBySession.set(row.conversationId, row.recordedAt);
      } catch {
        /* skip */
      }
    }
  }
  return [...lastBySession.entries()]
    .map(([sessionId, lastRecordedAt]) => ({ sessionId, lastRecordedAt }))
    .sort((a, b) => b.lastRecordedAt.localeCompare(a.lastRecordedAt));
}

/**
 * Prefer a bound session with hook data. Else newest transcript of this repo that has turns.
 * Else newest hook conversation on the machine.
 * @param {object} run
 * @param {{ usageHome?: string, transcriptIds?: string[] }} [opts]
 */
export function resolveSessionId(run, opts = {}) {
  const usageHome = opts.usageHome;
  const explicit = sessionIdFromRun(run);
  if (usageHome && isUsableSessionId(explicit) && readHookTurns(usageHome, explicit).length > 0) {
    return explicit;
  }
  const conversations = usageHome ? listHookConversations(usageHome) : [];
  if (!conversations.length) return isUsableSessionId(explicit) ? explicit : null;
  const allowed = Array.isArray(opts.transcriptIds) ? new Set(opts.transcriptIds) : null;
  if (allowed && allowed.size > 0) {
    const inProject = conversations.find((c) => allowed.has(c.sessionId));
    if (inProject) return inProject.sessionId;
  }
  return conversations[0].sessionId;
}

function modelFromTurns(turns) {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (typeof turns[i].model === "string" && turns[i].model) return turns[i].model;
  }
  return null;
}

/**
 * Overlay hook totals on a run. Parent-only. Never invent a 0. totalUsd stays null.
 * @param {object} run
 * @param {{ values?: object, model?: string | null }[]} turns
 */
export function applyHookUsage(run, turns) {
  if (!run || typeof run !== "object" || !Array.isArray(turns) || turns.length === 0) {
    return { applied: false, run, delta: null };
  }
  const values = sumHookTurns(turns);
  const hasAny = Object.values(values).some((n) => n !== null);
  if (!hasAny) return { applied: false, run, delta: null };

  const previous =
    run.tokens && typeof run.tokens === "object" && run.tokens.values && typeof run.tokens.values === "object"
      ? run.tokens.values
      : null;
  const delta = previous
    ? {
        input: counterOrNull(values.input, previous.input),
        output: counterOrNull(values.output, previous.output),
        cachedInput: counterOrNull(values.cachedInput, previous.cachedInput),
        cacheWriteInput: counterOrNull(values.cacheWriteInput, previous.cacheWriteInput),
        total: counterOrNull(values.total, previous.total),
        reasoningOutput: null,
      }
    : values;

  const model = typeof run.model === "string" && run.model ? run.model : modelFromTurns(turns);
  const estimate = estimateCostUsd(model, values);
  const previousCost = run.cost && typeof run.cost === "object" ? run.cost : {};

  return {
    applied: true,
    delta,
    run: {
      ...run,
      model: run.model ?? model ?? null,
      tokens: {
        scope: "parent-only",
        coverage: "hook",
        values,
      },
      cost: {
        currency: typeof previousCost.currency === "string" ? previousCost.currency : "USD",
        kind: "api-equivalent",
        totalUsd: roundUsd(previousCost.totalUsd),
        subtotalUsd: estimate ? estimate.amountUsd : null,
        coverage: "partial",
        source: estimate ? "rate-card" : "unknown",
        scope: "parent-only",
      },
    },
  };
}

function counterOrNull(current, previous) {
  if (current === null || previous === null || previous === undefined) return null;
  if (typeof current !== "number" || typeof previous !== "number") return null;
  const delta = current - previous;
  return delta >= 0 ? delta : null;
}

/**
 * @param {object} run
 * @param {string | undefined} usageHome
 * @param {string | undefined} transcriptsDir
 */
export function enrichRunWithHook(run, usageHome, transcriptsDir) {
  if (!run || !usageHome) return run;
  const sessionId = resolveSessionId(run, {
    usageHome,
    transcriptIds: listTranscriptIds(transcriptsDir),
  });
  if (!sessionId) return run;
  const turns = readHookTurns(usageHome, sessionId);
  const hooked = applyHookUsage(run, turns);
  const base = hooked.applied ? hooked.run : { ...run };
  const traces = base.traces && typeof base.traces === "object" ? { ...base.traces } : {};
  traces.sessionId = sessionId;

  const hookSettings = turns.reduce(
    (acc, turn) => (turn.settings ? mergeSessionSettings(turn.settings, acc) : acc),
    emptySessionSettings()
  );
  const prior =
    traces.settings && typeof traces.settings === "object"
      ? extractHookSettings(traces.settings)
      : run.traceMetadata && typeof run.traceMetadata === "object"
        ? extractHookSettings(run.traceMetadata.sessionSettings ?? run.traceMetadata)
        : emptySessionSettings();
  const composer = extractComposerSettings(readComposerData(usageHome, sessionId));
  const settings = mergeSessionSettings(composer, mergeSessionSettings(hookSettings, prior));
  if (hasSessionSettings(settings)) traces.settings = settings;

  const contextUsage = summarizeContextUsage(turns);
  const priorContext =
    traces.contextUsage && typeof traces.contextUsage === "object"
      ? traces.contextUsage
      : run.traceMetadata && typeof run.traceMetadata === "object"
        ? run.traceMetadata.contextUsage
        : null;
  const mergedContext = {
    peakInputTokens: contextUsage.peakInputTokens ?? priorContext?.peakInputTokens ?? null,
    lastInputTokens: contextUsage.lastInputTokens ?? priorContext?.lastInputTokens ?? null,
  };
  if (mergedContext.peakInputTokens !== null || mergedContext.lastInputTokens !== null) {
    traces.contextUsage = mergedContext;
  }

  return { ...base, traces };
}
