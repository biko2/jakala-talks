/**
 * Active timing for a /deliver run: wall clock minus human waits.
 * Never invent a 0 when timestamps are missing.
 */

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function parseIsoMs(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function isoOrNull(value) {
  return parseIsoMs(value) === null ? null : value;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function durationOrNull(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

/**
 * @param {number | null | undefined} ms
 * @returns {string | null}
 */
export function formatDuration(ms) {
  const value = durationOrNull(ms);
  if (value === null) return null;
  if (value === 0) return "0s";
  if (value < 1000) return `${value}ms`;
  const totalSec = Math.floor(value / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function isHumanWaitStep(value) {
  return value === "human-wait" || value === "wait";
}

/**
 * @param {object} data
 * @returns {{ start: number, end: number }[]}
 */
function collectHumanWaitIntervals(data) {
  /** @type {{ start: number, end: number }[]} */
  const raw = [];

  const pushInterval = (startValue, endValue) => {
    const start = parseIsoMs(startValue);
    const end = parseIsoMs(endValue);
    if (start === null || end === null || end <= start) return;
    raw.push({ start, end });
  };

  for (const wait of asList(data.humanWaits)) {
    if (!wait || typeof wait !== "object") continue;
    pushInterval(wait.startedAt, wait.endedAt);
  }

  const timing = data.timing && typeof data.timing === "object" ? data.timing : {};
  for (const wait of asList(timing.humanWaits)) {
    if (!wait || typeof wait !== "object") continue;
    pushInterval(wait.startedAt, wait.endedAt);
  }

  /** @type {number[]} */
  const openStarts = [];
  const timeline = asList(data.timeline)
    .filter((item) => item && typeof item === "object")
    .slice()
    .sort((a, b) => (parseIsoMs(a.at) ?? 0) - (parseIsoMs(b.at) ?? 0));

  for (const item of timeline) {
    if (item.startedAt && item.endedAt && isHumanWaitStep(item.step || item.kind)) {
      pushInterval(item.startedAt, item.endedAt);
      continue;
    }
    if (!isHumanWaitStep(item.step || item.kind)) continue;
    if (item.status === "started") {
      const start = parseIsoMs(item.at);
      if (start !== null) openStarts.push(start);
      continue;
    }
    if (item.status === "done" && openStarts.length > 0) {
      const start = openStarts.shift();
      pushInterval(new Date(start).toISOString(), item.at);
    }
  }

  return mergeIntervals(raw);
}

/**
 * @param {{ start: number, end: number }[]} intervals
 * @returns {{ start: number, end: number }[]}
 */
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (const next of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (next.start <= last.end) {
      last.end = Math.max(last.end, next.end);
    } else {
      merged.push({ ...next });
    }
  }
  return merged;
}

/**
 * @param {{ start: number, end: number }[]} intervals
 * @returns {number}
 */
function sumIntervals(intervals) {
  return intervals.reduce((total, interval) => total + (interval.end - interval.start), 0);
}

function collectInstants(data) {
  /** @type {number[]} */
  const times = [];
  const push = (value) => {
    const ms = parseIsoMs(value);
    if (ms !== null) times.push(ms);
  };

  const timing = data.timing && typeof data.timing === "object" ? data.timing : {};
  push(timing.startedAt);
  push(timing.endedAt);
  push(data.recordedAt);

  for (const item of asList(data.timeline)) push(item.at);
  for (const phase of asList(data.phases)) {
    push(phase.startedAt);
    push(phase.endedAt);
    for (const check of asList(phase.checks)) push(check.at);
  }
  for (const agent of asList(data.agents)) {
    push(agent.startedAt);
    push(agent.endedAt);
  }
  for (const item of asList(data.feedback)) push(item.at);
  for (const item of asList(data.evidence)) push(item.at);
  for (const item of asList(data.failures)) push(item.at);
  return times;
}

function parentClosed(data) {
  const parent = asList(data.agents).find(
    (agent) => agent && (agent.kind === "parent" || agent.id === "parent")
  );
  if (!parent) return false;
  if (parent.status === "done" || parent.status === "failed") return true;
  return parseIsoMs(parent.endedAt) !== null;
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

/**
 * @param {object} data
 */
function subtractWaits(baseMs, waitMs) {
  if (baseMs === null) return null;
  return Math.max(0, baseMs - waitMs);
}

export function resolveRunTiming(data) {
  const run = data && typeof data === "object" ? data : {};
  const explicit = run.timing && typeof run.timing === "object" ? run.timing : {};
  const explicitStart = isoOrNull(explicit.startedAt);
  const explicitEnd = isoOrNull(explicit.endedAt);
  const explicitMs = durationOrNull(explicit.durationMs);
  const humanWaitMs = sumIntervals(collectHumanWaitIntervals(run));

  if (explicitStart && (explicitEnd || explicitMs !== null)) {
    const startMs = parseIsoMs(explicitStart);
    const endMs = explicitEnd ? parseIsoMs(explicitEnd) : startMs + (explicitMs || 0);
    const wallMs =
      startMs !== null && endMs !== null && endMs >= startMs ? endMs - startMs : null;
    const durationMs = explicitMs !== null ? explicitMs : subtractWaits(wallMs, humanWaitMs);
    return {
      startedAt: explicitStart,
      endedAt: explicitEnd,
      durationMs,
      humanWaitMs,
      label: formatDuration(durationMs),
      coverage: "complete",
      source: "explicit",
      running: false,
    };
  }

  const times = collectInstants(run);
  if (times.length === 0) {
    return {
      startedAt: null,
      endedAt: null,
      durationMs: null,
      humanWaitMs,
      label: null,
      coverage: "unknown",
      source: "unknown",
      running: false,
    };
  }

  const startMs = Math.min(...times);
  const endMs = Math.max(...times);
  const complete = parentClosed(run) && times.length > 1;
  const wallMs = times.length > 1 && endMs >= startMs ? endMs - startMs : null;
  const durationMs = subtractWaits(wallMs, humanWaitMs);

  return {
    startedAt: toIso(startMs),
    endedAt: times.length > 1 ? toIso(endMs) : null,
    durationMs,
    humanWaitMs,
    label: formatDuration(durationMs),
    coverage: complete ? "complete" : durationMs !== null ? "partial" : "unknown",
    source: "events",
    running: !complete,
  };
}
