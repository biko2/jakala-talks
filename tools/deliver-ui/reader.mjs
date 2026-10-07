import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { estimateCostUsd, formatModelTitle, roundUsd } from "./cost.mjs";
import { enrichRunWithHook } from "./hook.mjs";
import { resolveRunTiming } from "./timing.mjs";
import { formatSessionTelemetry } from "./session-settings.mjs";

/**
 * @param {string} filename
 * @returns {string} id without .json
 */
export function runIdFromFilename(filename) {
  const base = basename(filename);
  return base.endsWith(".json") ? base.slice(0, -5) : base;
}

/**
 * Never invent a 0 for missing tokens.
 * @param {unknown} value
 * @returns {number | null}
 */
export function nullableNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

/**
 * @param {unknown} raw
 * @param {string} id
 * @returns {{ ok: true, id: string, data: object } | { ok: false, id: string, error: string }}
 */
export function parseRunContent(raw, id) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, id, error: "JSON inválido" };
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, id, error: "El run no es un objeto" };
  }

  return { ok: true, id, data };
}

/**
 * Summary fields for the list view. Broken runs stay in the list marked invalid.
 * @param {{ ok: true, id: string, data: object } | { ok: false, id: string, error: string }} parsed
 */
export function toListItem(parsed) {
  if (!parsed.ok) {
    return {
      id: parsed.id,
      valid: false,
      error: parsed.error,
      recordedAt: null,
      model: null,
      modelTitle: formatModelTitle(null),
      mode: null,
      ciStatus: "unknown",
      acceptanceMet: null,
      acceptanceTotal: null,
      tokensTotal: null,
      costUsd: null,
      costSubtotalUsd: null,
      costCoverage: "unknown",
      durationMs: null,
      parentIssue: null,
      pr: null,
      branch: null,
      failuresOpen: 0,
      feedbackOpen: 0,
      children: [],
      orphans: [],
    };
  }

  const { data, id } = parsed;
  const tokens = data.tokens && typeof data.tokens === "object" ? data.tokens : null;
  const values = tokens && tokens.values && typeof tokens.values === "object" ? tokens.values : null;
  const acceptance =
    data.acceptance && typeof data.acceptance === "object" ? data.acceptance : null;
  const ci = data.ci && typeof data.ci === "object" ? data.ci : null;
  const parent =
    data.parentIssue && typeof data.parentIssue === "object" ? data.parentIssue : null;
  const pr = data.pr && typeof data.pr === "object" ? data.pr : null;

  const cost = resolveRunCost(data);
  const timing = resolveRunTiming(data);
  const graph = resolveAgentGraph(data);

  return {
    id,
    valid: true,
    error: null,
    recordedAt: typeof data.recordedAt === "string" ? data.recordedAt : null,
    model: typeof data.model === "string" ? data.model : null,
    modelTitle: formatModelTitle(typeof data.model === "string" ? data.model : null),
    mode: typeof data.mode === "string" ? data.mode : null,
    ciStatus:
      ci && typeof ci.status === "string" ? ci.status : "unknown",
    acceptanceMet: acceptance ? nullableNumber(acceptance.met) : null,
    acceptanceTotal: acceptance ? nullableNumber(acceptance.total) : null,
    tokensTotal: values ? nullableNumber(values.total) : null,
    costUsd: cost.totalUsd,
    costSubtotalUsd: cost.subtotalUsd,
    costCoverage: cost.coverage,
    durationMs: timing.durationMs,
    parentIssue:
      parent && typeof parent.number === "number"
        ? {
            number: parent.number,
            url: typeof parent.url === "string" ? parent.url : null,
            title: typeof parent.title === "string" ? parent.title : null,
          }
        : null,
    pr:
      pr && typeof pr.number === "number"
        ? { number: pr.number, url: typeof pr.url === "string" ? pr.url : null }
        : null,
    branch: typeof data.branch === "string" ? data.branch : null,
    failuresOpen: observabilityCounts(data).failuresOpen,
    feedbackOpen: observabilityCounts(data).feedbackOpen,
    children: listAgentRefs(graph.children, parentAgentId(graph.parent)),
    orphans: listAgentRefs(graph.orphans, null),
  };
}

function parentAgentId(parent) {
  return parent && typeof parent.id === "string" ? parent.id : "parent";
}

function listAgentRefs(agents, fallbackParentId) {
  return agents.map((agent) => ({
    agentId: typeof agent.id === "string" ? agent.id : "",
    parentAgentId:
      typeof agent.parentId === "string" && agent.parentId
        ? agent.parentId
        : fallbackParentId,
    role: typeof agent.role === "string" ? agent.role : null,
    status: typeof agent.status === "string" ? agent.status : null,
  }));
}

/**
 * Tree from explicit refs only. `parent.childIds` that exist in `agents[]` are children.
 * Agents with `parentId` not listed on the parent are orphans. No inferred edges.
 *
 * @param {object} data
 */
export function resolveAgentGraph(data) {
  const agents = asRecordList(data && typeof data === "object" ? data.agents : []);
  const byId = new Map();
  for (const agent of agents) {
    if (typeof agent.id === "string" && agent.id) byId.set(agent.id, agent);
  }

  const parent =
    agents.find((agent) => agent.kind === "parent" || agent.id === "parent") || null;
  const childIds = Array.isArray(parent?.childIds)
    ? parent.childIds.filter((id) => typeof id === "string" && id)
    : [];
  const listed = new Set(childIds);
  const children = childIds.map((id) => byId.get(id)).filter(Boolean);
  const orphans = agents.filter((agent) => {
    if (agent === parent) return false;
    if (agent.kind === "parent" || agent.id === "parent") return false;
    if (listed.has(agent.id)) return false;
    return typeof agent.parentId === "string" && Boolean(agent.parentId);
  });

  return { parent, children, orphans };
}

/**
 * @param {string} runsDir
 * @returns {ReturnType<typeof toListItem>[]}
 */
export function listRuns(runsDir, usageHome, transcriptsDir) {
  if (!existsSync(runsDir)) {
    return [];
  }

  const files = readdirSync(runsDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse();

  return files.map((name) => {
    const id = runIdFromFilename(name);
    const filePath = join(runsDir, name);
    let raw;
    try {
      raw = readFileSync(filePath, "utf8");
    } catch (err) {
      return toListItem({
        ok: false,
        id,
        error: err instanceof Error ? err.message : "No se pudo leer el fichero",
      });
    }
    const parsed = parseRunContent(raw, id);
    if (!parsed.ok) return toListItem(parsed);
    return toListItem({
      ...parsed,
      data: enrichRunWithHook(parsed.data, usageHome, transcriptsDir),
    });
  });
}

/**
 * Normalize tools / categories / skills into { name: number }.
 * Skills may be numbers or objects with counters.
 * @param {unknown} map
 * @returns {Record<string, number>}
 */
export function normalizeCountMap(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  /** @type {Record<string, number>} */
  const out = {};
  for (const [name, info] of Object.entries(map)) {
    if (typeof info === "number" && Number.isFinite(info)) {
      out[name] = info;
      continue;
    }
    if (info && typeof info === "object") {
      const n =
        (typeof info.activityAttributed === "number" ? info.activityAttributed : 0) +
        (typeof info.loaded === "number" ? info.loaded : 0) +
        (typeof info.completed === "number" ? info.completed : 0) +
        (typeof info.manuallyInvoked === "number" ? info.manuallyInvoked : 0) +
        (typeof info.automaticallySelected === "number" ? info.automaticallySelected : 0);
      out[name] = n;
      continue;
    }
  }
  return out;
}

export function asRecordList(value) {
  return Array.isArray(value) ? value.filter((x) => x && typeof x === "object") : [];
}

/**
 * @param {object} data
 */
export function observabilityCounts(data) {
  const failures = asRecordList(data.failures);
  const feedback = asRecordList(data.feedback);
  const traces = data.traces && typeof data.traces === "object" ? data.traces : {};
  const slices = Array.isArray(traces.sessionSlices) ? traces.sessionSlices.length : 0;
  const hasTrace = Boolean(data.traceMetadata || traces.sessionId || traces.transcriptHint || slices);
  return {
    phases: asRecordList(data.phases).length,
    agents: asRecordList(data.agents).length,
    traces: hasTrace ? 1 : 0,
    feedback: feedback.length,
    feedbackOpen: feedback.filter((f) => f.status === "open").length,
    evidence: asRecordList(data.evidence).length,
    failures: failures.length,
    failuresOpen: failures.filter((f) => f.resolved !== true).length,
  };
}

/**
 * Prefer explicit timeline; otherwise derive a coarse one from the run fields.
 * @param {object} data
 * @returns {{ at: string | null, step: string, status: string, label: string, detail?: string }[]}
 */
export function resolveTimeline(data) {
  if (Array.isArray(data.timeline) && data.timeline.length > 0) {
    return data.timeline
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
        at: typeof e.at === "string" ? e.at : null,
        step: typeof e.step === "string" ? e.step : "note",
        status: typeof e.status === "string" ? e.status : "done",
        label: typeof e.label === "string" ? e.label : String(e.step || "paso"),
        detail: typeof e.detail === "string" ? e.detail : undefined,
        costUsd: nullableNumber(e.costUsd),
        tokensDelta:
          e.tokensDelta && typeof e.tokensDelta === "object" ? e.tokensDelta : undefined,
      }));
  }

  const at = typeof data.recordedAt === "string" ? data.recordedAt : null;
  const gates = data.humanGates && typeof data.humanGates === "object" ? data.humanGates : {};
  const ci = data.ci && typeof data.ci === "object" ? data.ci : {};
  const events = [];

  events.push({
    at,
    step: "mode",
    status: "done",
    label: `Modo ${data.mode === "autonomous" ? "autónomo" : "3 paradas"}`,
  });
  events.push({
    at,
    step: "grill",
    status: gates.grillConfirmed ? "done" : "pending",
    label: "Grill",
  });
  events.push({
    at,
    step: "spec",
    status: gates.specConfirmed
      ? "done"
      : data.mode === "autonomous"
        ? "skipped"
        : data.parentIssue
          ? "done"
          : "pending",
    label: data.parentIssue ? `Spec #${data.parentIssue.number}` : "Spec",
  });
  events.push({
    at,
    step: "tickets",
    status: gates.ticketsConfirmed
      ? "done"
      : data.mode === "autonomous"
        ? Array.isArray(data.ticketIssues) && data.ticketIssues.length
          ? "done"
          : "skipped"
        : Array.isArray(data.ticketIssues) && data.ticketIssues.length
          ? "done"
          : "pending",
    label:
      Array.isArray(data.ticketIssues) && data.ticketIssues.length
        ? `Tickets (${data.ticketIssues.length})`
        : "Tickets",
  });
  events.push({
    at,
    step: "implement",
    status:
      data.acceptance &&
      typeof data.acceptance.met === "number" &&
      typeof data.acceptance.total === "number" &&
      data.acceptance.total > 0 &&
      data.acceptance.met >= data.acceptance.total
        ? "done"
        : data.acceptance && data.acceptance.met > 0
          ? "started"
          : "pending",
    label:
      data.acceptance && typeof data.acceptance.met === "number"
        ? `Implementación ${data.acceptance.met}/${data.acceptance.total}`
        : "Implementación (tdd)",
  });
  events.push({
    at,
    step: "review",
    status: Array.isArray(data.specGaps) ? "done" : "pending",
    label: "Code review",
    detail:
      Array.isArray(data.specGaps) && data.specGaps.length
        ? `${data.specGaps.length} hueco(s) de spec`
        : undefined,
  });
  events.push({
    at,
    step: "pr",
    status: data.pr ? "done" : "pending",
    label: data.pr ? `PR #${data.pr.number}` : "PR",
  });
  const ciStatus = typeof ci.status === "string" ? ci.status : "unknown";
  events.push({
    at,
    step: "ci",
    status:
      ciStatus === "passed" ? "done" : ciStatus === "failed" ? "failed" : "pending",
    label: `CI ${ciStatus}`,
  });

  return events;
}

/**
 * Economic cost. API-equivalent USD. Never invent a 0 for missing data.
 * Prefers `cost` on the run, then `traceMetadata.apiCost`, then parent tokens × rate card.
 * Per-step / per-agent `costUsd` is ignored.
 * @param {object} data
 */
export function resolveRunCost(data) {
  const run = data && typeof data === "object" ? data : {};
  const explicit = run.cost && typeof run.cost === "object" ? run.cost : null;
  const api =
    run.traceMetadata &&
    typeof run.traceMetadata === "object" &&
    run.traceMetadata.apiCost &&
    typeof run.traceMetadata.apiCost === "object"
      ? run.traceMetadata.apiCost
      : null;

  const estimated = estimateCostUsd(
    run.model,
    run.tokens && typeof run.tokens === "object" ? run.tokens.values : null
  );

  const totalUsd = nullableNumber(explicit?.totalUsd) ?? nullableNumber(api?.totalUsd);
  const subtotalUsd =
    nullableNumber(explicit?.subtotalUsd) ??
    nullableNumber(api?.subtotalUsd) ??
    (estimated ? estimated.amountUsd : null);

  let coverage = "unknown";
  if (typeof explicit?.coverage === "string") {
    coverage = explicit.coverage;
  } else if (totalUsd !== null) {
    coverage = "complete";
  } else if (subtotalUsd !== null) {
    coverage = "partial";
  }

  let source = "unknown";
  if (typeof explicit?.source === "string") source = explicit.source;
  else if (api) source = "trace";
  else if (estimated) source = "rate-card";

  return {
    currency: typeof explicit?.currency === "string" ? explicit.currency : "USD",
    kind:
      typeof explicit?.kind === "string"
        ? explicit.kind
        : typeof api?.basis === "string"
          ? api.basis
          : "api-equivalent",
    totalUsd: roundUsd(totalUsd),
    subtotalUsd: roundUsd(subtotalUsd),
    coverage,
    source,
  };
}

/**
 * One stream: workflow steps + phases/checks + agents + traces + feedback + evidence + failures.
 * @param {object} data
 * @returns {{ at: string | null, kind: string, step: string, status: string, label: string, detail?: string }[]}
 */
export function mergeUnifiedTimeline(data) {
  /** @type {{ at: string | null, kind: string, step: string, status: string, label: string, detail?: string }[]} */
  const events = [];

  const push = (event) => {
    if (!event || typeof event !== "object") return;
    const priced =
      nullableNumber(event.costUsd) ??
      estimateCostUsd(data.model, event.tokensDelta)?.amountUsd ??
      null;
    events.push({
      at: typeof event.at === "string" ? event.at : null,
      kind: event.kind,
      step: event.step || event.kind,
      status: event.status || "pending",
      label: event.label || event.kind,
      detail: event.detail || undefined,
      costUsd: priced,
    });
  };

  for (const e of resolveTimeline(data)) {
    push({
      at: e.at,
      kind: "step",
      step: e.step,
      status: e.status,
      label: e.label,
      detail: e.detail,
      costUsd: e.costUsd,
      tokensDelta: e.tokensDelta,
    });
  }

  for (const phase of asRecordList(data.phases)) {
    push({
      at: phase.startedAt || phase.endedAt || null,
      kind: "phase",
      step: typeof phase.id === "string" ? phase.id : "phase",
      status: typeof phase.status === "string" ? phase.status : "pending",
      label: typeof phase.label === "string" ? phase.label : String(phase.id || "fase"),
      detail: phase.endedAt ? `fin ${phase.endedAt}` : undefined,
    });
    for (const check of asRecordList(phase.checks)) {
      const checkStatus =
        check.status === "pass"
          ? "done"
          : check.status === "fail"
            ? "failed"
            : check.status === "skip"
              ? "skipped"
              : "pending";
      push({
        at: check.at || phase.endedAt || phase.startedAt || null,
        kind: "check",
        step: typeof check.id === "string" ? check.id : "check",
        status: checkStatus,
        label: typeof check.label === "string" ? check.label : String(check.id || "check"),
        detail: `fase ${phase.id || "?"} · ${check.status || "pending"}`,
      });
    }
  }

  for (const agent of asRecordList(data.agents)) {
    const ticket =
      agent.ticketIssue != null ? `ticket #${agent.ticketIssue}` : agent.kind || "";
    push({
      at: agent.startedAt || agent.endedAt || null,
      kind: "agent",
      step: typeof agent.role === "string" ? agent.role : "agent",
      status: typeof agent.status === "string" ? agent.status : "pending",
      label: typeof agent.id === "string" ? agent.id : String(agent.role || "agente"),
      detail: [agent.model, ticket].filter(Boolean).join(" · ") || undefined,
      costUsd: agent.costUsd,
      tokensDelta: agent.tokensDelta,
    });
  }

  const traces = data.traces && typeof data.traces === "object" ? data.traces : {};
  if (traces.sessionId || traces.transcriptHint || data.traceMetadata) {
    const settings = traces.settings || data.traceMetadata?.sessionSettings;
    const contextUsage = traces.contextUsage || data.traceMetadata?.contextUsage;
    const telemetry = formatSessionTelemetry(settings, contextUsage);
    const detail = [traces.transcriptHint, telemetry].filter(Boolean).join(" · ");
    push({
      at: typeof data.recordedAt === "string" ? data.recordedAt : null,
      kind: "trace",
      step: "trace",
      status: data.traceMetadata ? "done" : "started",
      label: traces.sessionId ? `sesión ${traces.sessionId}` : "Traza",
      detail: detail || (data.traceMetadata ? "traceMetadata" : undefined),
    });
  }
  if (Array.isArray(traces.sessionSlices)) {
    traces.sessionSlices.forEach((slice, index) => {
      if (!slice || typeof slice !== "object") return;
      push({
        at: slice.startedAt || slice.endedAt || null,
        kind: "trace",
        step: "slice",
        status: "done",
        label: `slice ${index + 1}`,
        detail: slice.sessionId || undefined,
      });
    });
  }

  for (const item of asRecordList(data.feedback)) {
    const fbStatus =
      item.status === "open"
        ? "failed"
        : item.status === "fixed"
          ? "done"
          : item.status === "skipped"
            ? "skipped"
            : "pending";
    push({
      at: item.at || null,
      kind: "feedback",
      step: typeof item.source === "string" ? item.source : "feedback",
      status: fbStatus,
      label: typeof item.summary === "string" ? item.summary : "Feedback",
      detail: [item.severity, item.status, item.url].filter(Boolean).join(" · ") || undefined,
    });
  }

  for (const item of asRecordList(data.evidence)) {
    const evStatus =
      item.result === "pass" ? "done" : item.result === "fail" ? "failed" : "pending";
    push({
      at: item.at || null,
      kind: "evidence",
      step: typeof item.kind === "string" ? item.kind : "evidence",
      status: evStatus,
      label: typeof item.label === "string" ? item.label : String(item.kind || "evidencia"),
      detail: item.ref || item.detail || undefined,
    });
  }

  for (const item of asRecordList(data.failures)) {
    push({
      at: item.at || null,
      kind: "failure",
      step: typeof item.kind === "string" ? item.kind : "failure",
      status: item.resolved ? "done" : "failed",
      label: typeof item.summary === "string" ? item.summary : String(item.kind || "fallo"),
      detail: [`fase ${item.phase || "?"}`, `intentos ${item.attempts ?? "—"}`, item.detail]
        .filter(Boolean)
        .join(" · "),
    });
  }

  events.sort((a, b) => {
    if (a.at === b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
  });
  return events;
}

/**
 * @param {{ kind: string }[]} events
 * @param {Iterable<string> | null} kinds
 */
export function filterUnifiedTimeline(events, kinds) {
  if (!kinds) return events;
  const allowed = new Set(kinds);
  if (allowed.size === 0) return [];
  return events.filter((event) => allowed.has(event.kind));
}

/**
 * @param {string} runsDir
 * @param {string} id
 */
export function getRun(runsDir, id, usageHome, transcriptsDir) {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) {
    return { ok: false, id, error: "id inválido", status: 400 };
  }

  const filePath = join(runsDir, `${id}.json`);
  if (!existsSync(filePath)) {
    return { ok: false, id, error: "Run no encontrado", status: 404 };
  }

  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    return {
      ok: false,
      id,
      error: err instanceof Error ? err.message : "No se pudo leer el fichero",
      status: 500,
    };
  }

  const parsed = parseRunContent(raw, id);
  if (!parsed.ok) {
    return { ...parsed, status: 422 };
  }
  const data = enrichRunWithHook(parsed.data, usageHome, transcriptsDir);
  return {
    ok: true,
    id: parsed.id,
    data,
    timeline: resolveTimeline(data),
    events: mergeUnifiedTimeline(data),
    cost: resolveRunCost(data),
    timing: resolveRunTiming(data),
    agentGraph: resolveAgentGraph(data),
    modelTitle: formatModelTitle(data.model),
  };
}
