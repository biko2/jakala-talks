import { resolveAgentTiming } from "/assets/timing.mjs";

const listEl = document.getElementById("run-list");
const emptyEl = document.getElementById("empty");
const detailEl = document.getElementById("detail");
const filterModel = document.getElementById("filter-model");
const filterCi = document.getElementById("filter-ci");
const refreshBtn = document.getElementById("refresh");
const layoutEl = document.getElementById("layout");
const listToggle = document.getElementById("toggle-list");
const LIST_COLLAPSE_KEY = "deliver-ui-list-collapsed";

/** @type {any[]} */
let runs = [];
let selectedId = null;
/** @type {string | null} */
let selectedAgentId = null;
/** @type {ReturnType<typeof setInterval> | null} */
let agentClockTimer = null;
/** @type {any | null} */
let selectedPayload = null;
/** @type {EventSource | null} */
let eventSource = null;
let reloadTimer = null;
/** @type {Record<string, boolean>} */
const sectionCollapsed = {
  timeline: false,
  gates: true,
  links: true,
  ciFailed: true,
  specGaps: true,
  tokens: true,
  tools: true,
  categories: true,
  skills: true,
  children: false,
};

const EVENT_KINDS = [
  ["step", "paso"],
  ["phase", "fase"],
  ["check", "check"],
  ["agent", "agente"],
  ["trace", "traza"],
  ["feedback", "feedback"],
  ["evidence", "evidencia"],
  ["failure", "fallo"],
];

const KIND_HINTS = {
  step: "Paso del flujo /deliver (modo, grill, spec, tickets, impl, review, PR, CI…).",
  phase: "Fase completa. Agrupa varios pasos hasta que cierra.",
  check: "Criterio o check de aceptación de una fase.",
  agent: "Subagente o sesión (parent, tdd, review…).",
  trace: "Traza o transcripción de la sesión.",
  feedback: "Hallazgo de review (severidad y si se corrigió).",
  evidence: "Prueba (commit, test u otro artefacto).",
  failure: "Fallo o intento fallido (lint, CI, etc.).",
};

const STATUS_HINTS = {
  done: "Hecho: el evento ya cerró bien.",
  started: "En curso: aún no termina.",
  skipped: "Saltado: el flujo lo omitió.",
  pending: "Pendiente: aún no arranca.",
  failed: "Fallido: error o rechazo.",
};

/** @type {Set<string>} */
const timelineKindsOn = new Set();

function formatWhen(iso) {
  if (!iso) return "sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function modeLabel(mode) {
  if (mode === "three-gates") return "3 paradas";
  if (mode === "autonomous") return "autónomo";
  return mode || "—";
}

function ciClass(status) {
  if (status === "passed") return "ok";
  if (status === "failed") return "bad";
  return "warn";
}

function tokensLabel(total) {
  if (total === null || total === undefined) return "sin dato";
  return String(total);
}

function usdLabel(amount) {
  if (amount === null || amount === undefined) return "sin dato";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function durationLabel(ms) {
  if (ms === null || ms === undefined) return "sin dato";
  if (ms === 0) return "0s";
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

function costLabel(totalUsd, subtotalUsd) {
  if (totalUsd !== null && totalUsd !== undefined) return usdLabel(totalUsd);
  if (subtotalUsd !== null && subtotalUsd !== undefined) return `padre ${usdLabel(subtotalUsd)}`;
  return "sin dato";
}

function acceptanceLabel(met, total) {
  if (met === null || total === null) return "—";
  return `${met}/${total}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function filteredRuns() {
  const model = filterModel.value;
  const ci = filterCi.value;
  return runs.filter((run) => {
    if (model && (run.model || "") !== model) return false;
    if (ci && (run.ciStatus || "unknown") !== ci) return false;
    return true;
  });
}

function fillModelFilter() {
  const current = filterModel.value;
  const models = [
    ...new Set(runs.filter((r) => r.valid && r.model).map((r) => r.model)),
  ].sort();
  filterModel.innerHTML =
    `<option value="">Todos</option>` +
    models.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  if ([...filterModel.options].some((o) => o.value === current)) {
    filterModel.value = current;
  }
}

function isSelected(runId, agentId) {
  if (runId !== selectedId) return false;
  if (!agentId) return !selectedAgentId;
  return selectedAgentId === agentId;
}

function appendListButton(run, { agentId, title, sub, extraClass }) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `run-item${extraClass ? ` ${extraClass}` : ""}${isSelected(run.id, agentId) ? " active" : ""}${run.valid ? "" : " invalid"}`;
  btn.dataset.id = run.id;
  if (agentId) btn.dataset.agentId = agentId;
  btn.innerHTML = `
    <div class="run-title">${escapeHtml(title)}</div>
    <div class="when">${escapeHtml(sub)}</div>
  `;
  btn.addEventListener("click", () => selectRun(run.id, { agentId: agentId || null }));
  li.appendChild(btn);
  listEl.appendChild(li);
}

function renderList() {
  const items = filteredRuns();
  emptyEl.classList.toggle("hidden", runs.length > 0);
  listEl.innerHTML = "";

  for (const run of items) {
    if (!run.valid) {
      appendListButton(run, {
        agentId: null,
        title: run.error || run.id || "Ejecución inválida",
        sub: formatWhen(run.recordedAt),
      });
      continue;
    }

    appendListButton(run, {
      agentId: null,
      title: run.parentIssue?.title || "Sin título de tarea",
      sub: formatWhen(run.recordedAt),
    });

    for (const child of run.children || []) {
      appendListButton(run, {
        agentId: child.agentId,
        title: child.agentId,
        sub: child.parentAgentId || "parent",
        extraClass: "is-child",
      });
    }

    for (const orphan of run.orphans || []) {
      appendListButton(run, {
        agentId: orphan.agentId,
        title: orphan.agentId,
        sub: orphan.parentAgentId || "parent",
        extraClass: "is-orphan",
      });
    }
  }

  if (runs.length > 0 && items.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Ninguna ejecución coincide con el filtro.";
    listEl.appendChild(p);
  }
}

function hashHue(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

function normalizeCountMap(map) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [name, info] of Object.entries(map)) {
    if (typeof info === "number" && Number.isFinite(info)) {
      out[name] = info;
      continue;
    }
    if (info && typeof info === "object") {
      out[name] =
        (info.activityAttributed || 0) +
        (info.loaded || 0) +
        (info.completed || 0) +
        (info.manuallyInvoked || 0) +
        (info.automaticallySelected || 0);
    }
  }
  return out;
}

function countPills(map) {
  const entries = Object.entries(normalizeCountMap(map)).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return `<p class="muted">Sin datos</p>`;
  }
  return `<div class="tool-pills">${entries
    .map(([name, count]) => {
      const hue = hashHue(name);
      return `<span class="tool-pill" style="--pill-h:${hue}" title="${escapeHtml(name)}"><span class="tool-pill-name">${escapeHtml(name)}</span><span class="tool-pill-count">${count}</span></span>`;
    })
    .join("")}</div>`;
}

function gatePills(gates) {
  if (!gates || typeof gates !== "object") return `<span class="muted">—</span>`;
  const labels = [
    ["grillConfirmed", "grill"],
    ["specConfirmed", "spec"],
    ["ticketsConfirmed", "tickets"],
  ];
  return labels
    .map(([key, label]) => {
      const on = gates[key] === true;
      return `<span class="pill ${on ? "ok" : "warn"}">${label}: ${on ? "sí" : "no"}</span>`;
    })
    .join(" ");
}

function statusClass(status) {
  if (status === "done") return "done";
  if (status === "failed") return "failed";
  if (status === "started") return "started";
  if (status === "skipped") return "skipped";
  return "pending";
}

function kindLabel(kind) {
  const found = EVENT_KINDS.find(([id]) => id === kind);
  return found ? found[1] : kind || "?";
}

function tipAttrs(text) {
  return `data-tip="${escapeHtml(text)}"`;
}

function kindHint(kind) {
  return KIND_HINTS[kind] || `Tipo de evento: ${kind || "?"}.`;
}

function statusHint(status) {
  const raw = status || "pending";
  return STATUS_HINTS[raw] || STATUS_HINTS[statusClass(raw)] || `Estado: ${raw}.`;
}

function unifiedEventsFromPayload(payload) {
  if (Array.isArray(payload.events) && payload.events.length) return payload.events;
  const run = payload.run || {};
  if (Array.isArray(run.timeline)) {
    return run.timeline.map((e) => ({
      at: e.at || null,
      kind: "step",
      step: e.step || "step",
      status: e.status || "done",
      label: e.label || e.step || "paso",
      detail: e.detail,
      costUsd: e.costUsd ?? null,
    }));
  }
  return [];
}

function renderKindFilters(events) {
  const counts = Object.fromEntries(EVENT_KINDS.map(([id]) => [id, 0]));
  for (const event of events) {
    if (counts[event.kind] != null) counts[event.kind] += 1;
  }
  const filtering = timelineKindsOn.size > 0;
  const clearHint = filtering
    ? "Quita todos los filtros y vuelve a mostrar toda la timeline."
    : "Ningún filtro activo: se muestran todos los tipos.";
  return `<div class="kind-filters" role="group" aria-label="Filtrar timeline">
    ${EVENT_KINDS.map(([id, label]) => {
      const on = timelineKindsOn.has(id);
      const hue = hashHue(id);
      const hint = `${kindHint(id)} ${
        on
          ? "Clic para quitar este filtro."
          : filtering
            ? "Clic para sumar este tipo al filtro."
            : "Clic para ver solo este tipo."
      } (${counts[id] || 0} en este run).`;
      return `<button type="button" class="kind-chip${on ? " is-on" : ""}" data-kind-filter="${id}" style="--pill-h:${hue}" aria-pressed="${on ? "true" : "false"}" ${tipAttrs(hint)}>${escapeHtml(label)} <span class="kind-count">${counts[id] || 0}</span></button>`;
    }).join("")}
    <button type="button" class="kind-clear" data-kind-filter-clear ${filtering ? "" : "disabled "} ${tipAttrs(clearHint)}>Desmarcar todas</button>
  </div>`;
}

function renderTimeline(events) {
  const filtered =
    timelineKindsOn.size === 0 ? events : events.filter((e) => timelineKindsOn.has(e.kind));
  if (events.length === 0) {
    return `<p class="muted">Sin eventos todavía. El agente irá escribiendo la timeline en el JSON.</p>`;
  }
  if (filtered.length === 0) {
    return `<p class="muted">Ningún evento con esos filtros.</p>`;
  }
  const rows = filtered
    .map((e) => {
      const st = statusClass(e.status);
      const hue = hashHue(e.kind || "step");
      const what = e.label || e.step || "paso";
      const dotTip = `${statusHint(e.status)} Color del punto = este estado. ${what}.`;
      return `<li class="timeline-item ${st}">
        <span class="timeline-rail" tabindex="0" ${tipAttrs(dotTip)}><span class="timeline-dot" aria-hidden="true"></span></span>
        <span class="timeline-time">${escapeHtml(formatTime(e.at))}</span>
        <span class="timeline-kind"><span class="kind-chip is-on" tabindex="0" style="--pill-h:${hue}" ${tipAttrs(kindHint(e.kind))}>${escapeHtml(kindLabel(e.kind))}</span></span>
        <span class="timeline-label">${escapeHtml(what)}</span>
        <span class="timeline-step">${escapeHtml(e.step || "")}</span>
        <span class="timeline-status-cell"><span class="kind-chip is-on" tabindex="0" style="--pill-h:${hashHue(e.status || "pending")}" ${tipAttrs(statusHint(e.status))}>${escapeHtml(e.status || "?")}</span></span>
        <span class="timeline-detail">${e.detail ? escapeHtml(e.detail) : ""}</span>
      </li>`;
    })
    .join("");
  return `<div class="timeline-scroll">
    <ol class="timeline" id="unified-timeline">
      <li class="timeline-head">
        <span class="timeline-rail" aria-hidden="true"></span>
        <span>Hora</span>
        <span>Tipo</span>
        <span>Qué</span>
        <span>Paso</span>
        <span>Estado</span>
        <span>Detalle</span>
      </li>
      ${rows}
    </ol>
  </div>`;
}

function collapsibleSection(key, titleHtml, bodyHtml) {
  const collapsed = Boolean(sectionCollapsed[key]);
  return `<section class="block collapsible-block${collapsed ? " is-collapsed" : ""}" data-section="${escapeHtml(key)}">
      <button type="button" class="section-toggle" data-section-toggle="${escapeHtml(key)}" aria-expanded="${collapsed ? "false" : "true"}">
        <h3>${titleHtml}</h3>
        <span class="section-toggle-chevron" aria-hidden="true"></span>
      </button>
      <div class="section-toggle-body" ${collapsed ? "hidden" : ""}>
        ${bodyHtml}
      </div>
    </section>`;
}

function findAgent(run, agentId) {
  if (!agentId || !run) return null;
  return (Array.isArray(run.agents) ? run.agents : []).find((agent) => agent && agent.id === agentId) || null;
}

function agentGraphFrom(payload, run) {
  if (payload?.agentGraph) return payload.agentGraph;
  const agents = Array.isArray(run?.agents) ? run.agents : [];
  const parent = agents.find((agent) => agent && (agent.kind === "parent" || agent.id === "parent")) || null;
  const childIds = Array.isArray(parent?.childIds) ? parent.childIds : [];
  const listed = new Set(childIds);
  return {
    parent,
    children: childIds.map((id) => agents.find((agent) => agent.id === id)).filter(Boolean),
    orphans: agents.filter(
      (agent) =>
        agent &&
        agent !== parent &&
        typeof agent.parentId === "string" &&
        agent.parentId &&
        !listed.has(agent.id)
    ),
  };
}

function agentTimeLabel(run, agent, nowMs = Date.now()) {
  const timing = resolveAgentTiming(run, agent, nowMs);
  const text = timing.label || "—";
  return timing.running ? `${text} · en curso` : text;
}

function renderChildrenBlock(run, children) {
  if (!children.length) {
    return `<section class="block"><h3>Hijos</h3><p class="muted">Ninguno</p></section>`;
  }
  const rows = children
    .map((agent) => {
      const role = typeof agent.role === "string" ? agent.role : "";
      return `<li>
        <button type="button" class="child-link" data-select-agent="${escapeHtml(agent.id)}">${escapeHtml(agent.id)}</button>
        <span class="muted">${escapeHtml(role)}</span>
        <span data-agent-clock="${escapeHtml(agent.id)}">${escapeHtml(agentTimeLabel(run, agent))}</span>
      </li>`;
    })
    .join("");
  return `<section class="block">
    <h3>Hijos</h3>
    <ul class="child-times">${rows}</ul>
  </section>`;
}

function taskHeading(run, runId) {
  const number = run.parentIssue?.number;
  const title =
    (typeof run.parentIssue?.title === "string" && run.parentIssue.title) ||
    (typeof run.title === "string" && run.title) ||
    null;
  const idLabel = number != null ? `#${number}` : runId;
  const heading = title || (number != null ? `Issue #${number}` : "Tarea sin título");
  const issueLink =
    run.parentIssue?.url
      ? `<a class="task-id" href="${escapeHtml(run.parentIssue.url)}" target="_blank" rel="noreferrer">${escapeHtml(idLabel)}</a>`
      : `<span class="task-id">${escapeHtml(idLabel)}</span>`;

  return `
    <div class="task-heading">
      <p class="task-id-row">${issueLink}</p>
      <h2>${escapeHtml(heading)}</h2>
    </div>
  `;
}

function renderDetail(id, payload) {
  selectedPayload = payload;
  if (!payload) {
    stopAgentClock();
    detailEl.innerHTML = `<p class="placeholder">Elige una ejecución de la lista.</p>`;
    return;
  }

  if (payload.error) {
    stopAgentClock();
    detailEl.innerHTML = `
      <h2>${escapeHtml(id)}</h2>
      <div class="error-box">${escapeHtml(payload.error)}</div>
    `;
    return;
  }

  const run = payload.run;
  const tokens = run.tokens || {};
  const values = tokens.values || {};
  const ci = run.ci || {};
  const acceptance = run.acceptance || {};
  const gaps = Array.isArray(run.specGaps) ? run.specGaps : [];
  const events = unifiedEventsFromPayload(payload);
  const cost = payload.cost || {};
  const timing = payload.timing || {};
  const graph = agentGraphFrom(payload, run);
  const selectedAgent = findAgent(run, selectedAgentId);
  const childView = Boolean(selectedAgent && selectedAgentId && selectedAgentId !== graph.parent?.id);
  const linkedChild = childView && graph.children.some((agent) => agent.id === selectedAgentId);

  const links = [];
  if (run.parentIssue?.url) {
    const label = run.parentIssue.title
      ? `Spec #${run.parentIssue.number}: ${run.parentIssue.title}`
      : `Spec #${run.parentIssue.number}`;
    links.push(`<a href="${escapeHtml(run.parentIssue.url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`);
  }
  for (const t of run.ticketIssues || []) {
    if (t?.url) {
      const label = t.title ? `Ticket #${t.number}: ${t.title}` : `Ticket #${t.number}`;
      links.push(`<a href="${escapeHtml(t.url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`);
    }
  }
  if (run.pr?.url) {
    links.push(`<a href="${escapeHtml(run.pr.url)}" target="_blank" rel="noreferrer">PR #${run.pr.number}</a>`);
  }

  const heading = childView
    ? `<div class="task-heading">
        <p class="task-id-row"><span class="task-id">${escapeHtml(selectedAgent.id)}</span></p>
        <h2>${escapeHtml(selectedAgent.id)}</h2>
        ${
          linkedChild
            ? `<p class="sub"><button type="button" class="child-link" data-select-parent>padre ${escapeHtml(graph.parent?.id || "parent")}</button></p>`
            : ""
        }
      </div>`
    : taskHeading(run, id);

  const timeLabel = childView
    ? `<span data-agent-clock="${escapeHtml(selectedAgent.id)}">${escapeHtml(agentTimeLabel(run, selectedAgent))}</span>`
    : `${escapeHtml(timing.label || durationLabel(timing.durationMs ?? null))}${timing.running ? " · en curso" : ""}`;

  detailEl.innerHTML = `
    ${heading}
    <p class="sub">${escapeHtml(formatWhen(run.recordedAt))} · <code>${escapeHtml(id)}</code> · <span class="live-dot" title="escuchando cambios del fichero">live</span></p>

    <div class="links">${links.length ? links.join("") : `<span class="muted">Sin enlaces</span>`}</div>

    <div class="grid">
      <div class="stat"><span class="label">Modo</span><span class="value">${escapeHtml(modeLabel(run.mode))}</span></div>
      <div class="stat"><span class="label">Harness</span><span class="value">${escapeHtml(run.harness || "—")}</span></div>
      <div class="stat"><span class="label">Rama</span><span class="value"><code>${escapeHtml(run.branch || "—")}</code></span></div>
      <div class="stat"><span class="label">CI</span><span class="value">${escapeHtml(ci.status || "unknown")}</span></div>
    </div>

    <section class="metrics-block" aria-label="Métricas del modelo">
      <h3 class="metrics-title">${escapeHtml(payload.modelTitle || "modelo desconocido")}</h3>
      <div class="grid">
        <div class="stat"><span class="label">Tokens</span><span class="value">${escapeHtml(tokensLabel(values.total ?? null))}</span></div>
        <div class="stat"><span class="label">Subtotal padre</span><span class="value">${escapeHtml(costLabel(cost.totalUsd, cost.subtotalUsd))}</span></div>
        <div class="stat"><span class="label">Tiempo</span><span class="value">${timeLabel}</span></div>
      </div>
    </section>

    ${childView ? "" : renderChildrenBlock(run, graph.children)}

    ${collapsibleSection(
      "timeline",
      "Timeline",
      `${renderKindFilters(events)}<div id="timeline-body">${renderTimeline(events)}</div>`
    )}

    ${collapsibleSection("gates", "Paradas humanas", `<div>${gatePills(run.humanGates)}</div>`)}

    ${collapsibleSection(
      "ciFailed",
      "CI fallidos",
      Array.isArray(ci.checksFailed) && ci.checksFailed.length
        ? `<ul class="gaps">${ci.checksFailed.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
        : `<p class="muted">Ninguno</p>`
    )}

    ${collapsibleSection(
      "tokens",
      `Gasto de tokens estimado`,
      `<div class="grid">
        <div class="stat"><span class="label">input</span><span class="value">${escapeHtml(tokensLabel(values.input ?? null))}</span></div>
        <div class="stat"><span class="label">output</span><span class="value">${escapeHtml(tokensLabel(values.output ?? null))}</span></div>
        <div class="stat"><span class="label">cached</span><span class="value">${escapeHtml(tokensLabel(values.cachedInput ?? null))}</span></div>
        <div class="stat"><span class="label">cache write</span><span class="value">${escapeHtml(tokensLabel(values.cacheWriteInput ?? null))}</span></div>
        <div class="stat"><span class="label">reasoning</span><span class="value">${escapeHtml(tokensLabel(values.reasoningOutput ?? null))}</span></div>
        <div class="stat"><span class="label">total</span><span class="value">${escapeHtml(tokensLabel(values.total ?? null))}</span></div>
        <div class="stat"><span class="label">USD total</span><span class="value">${escapeHtml(usdLabel(cost.totalUsd ?? null))}</span></div>
        <div class="stat"><span class="label">USD subtotal</span><span class="value">${escapeHtml(usdLabel(cost.subtotalUsd ?? null))}</span></div>
        <div class="stat"><span class="label">USD cobertura</span><span class="value">${escapeHtml(cost.coverage || "unknown")}</span></div>
      </div>
      <p class="muted">Estimación API (lista Cursor) sobre tokens del hook, sesión padre only. No es la factura de Cursor. Subagentes fuera. ${escapeHtml(cost.kind || "api-equivalent")} · ${escapeHtml(cost.source || "unknown")}. Nunca se inventa un 0.</p>
      ${run.notes ? `<p class="muted">${escapeHtml(run.notes)}</p>` : ""}`
    )}

    ${collapsibleSection("skills", "Skills", countPills(run.skills))}
  `;

  syncAgentClock(run, childView ? [selectedAgent] : graph.children);
}

async function fetchRunDetail(id) {
  const res = await fetch(`/api/runs/${encodeURIComponent(id)}`);
  const body = await res.json();
  if (!res.ok) {
    return { error: body.error || res.statusText };
  }
  return body;
}

function stopAgentClock() {
  if (agentClockTimer) {
    clearInterval(agentClockTimer);
    agentClockTimer = null;
  }
}

function syncAgentClock(run, agents) {
  stopAgentClock();
  const live = (agents || []).filter((agent) => agent && !agent.endedAt && agent.startedAt);
  if (live.length === 0) return;
  const tick = () => {
    const nowMs = Date.now();
    for (const node of detailEl.querySelectorAll("[data-agent-clock]")) {
      const agent = findAgent(run, node.getAttribute("data-agent-clock"));
      if (!agent) continue;
      node.textContent = agentTimeLabel(run, agent, nowMs);
    }
  };
  tick();
  agentClockTimer = setInterval(tick, 1000);
}

async function selectRun(id, { quiet, agentId } = {}) {
  selectedId = id;
  if (agentId !== undefined) selectedAgentId = agentId;
  renderList();
  if (!quiet) {
    detailEl.innerHTML = `<p class="placeholder">Cargando…</p>`;
  }
  try {
    const body = await fetchRunDetail(id);
    if (selectedId !== id) return;
    renderDetail(id, body.error ? { error: body.error } : body);
  } catch (err) {
    if (selectedId !== id) return;
    renderDetail(id, {
      error: err instanceof Error ? err.message : "Error de red",
    });
  }
}

async function loadRuns({ keepSelection = true } = {}) {
  const res = await fetch("/api/runs");
  if (!res.ok) throw new Error(`No se pudo cargar /api/runs (${res.status})`);
  const body = await res.json();
  runs = Array.isArray(body.runs) ? body.runs : [];
  fillModelFilter();
  renderList();

  const stillThere = keepSelection && selectedId && runs.some((r) => r.id === selectedId);
  if (stillThere) {
    await selectRun(selectedId, { quiet: Boolean(selectedPayload) });
  } else if (runs.length > 0) {
    const firstValid = runs.find((r) => r.valid) || runs[0];
    await selectRun(firstValid.id);
  } else {
    selectedId = null;
    selectedAgentId = null;
    selectedPayload = null;
    stopAgentClock();
    renderDetail(null, null);
  }
}

function scheduleReload(ids) {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    const touchSelected =
      !ids || ids.length === 0 || ids.includes("") || (selectedId && ids.includes(selectedId));
    loadRuns({ keepSelection: true })
      .then(() => {
        if (touchSelected && selectedId) {
          return selectRun(selectedId, { quiet: true });
        }
        return undefined;
      })
      .catch((err) => {
        console.error(err);
      });
  }, 80);
}

function connectLive() {
  if (eventSource) {
    eventSource.close();
  }
  eventSource = new EventSource("/api/events");
  eventSource.addEventListener("runs-changed", (ev) => {
    let ids = [];
    try {
      ids = JSON.parse(ev.data).ids || [];
    } catch {
      ids = [];
    }
    scheduleReload(ids);
  });
  eventSource.addEventListener("run-changed", (ev) => {
    let id = null;
    try {
      id = JSON.parse(ev.data).id;
    } catch {
      id = null;
    }
    if (id && id === selectedId) {
      selectRun(selectedId, { quiet: true }).catch(console.error);
    }
  });
  eventSource.onerror = () => {
    // Browser reconnects EventSource automatically.
  };
}

refreshBtn.addEventListener("click", () => {
  loadRuns().catch((err) => {
    detailEl.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  });
});
filterModel.addEventListener("change", renderList);
filterCi.addEventListener("change", renderList);

function refreshTimelineFilters() {
  const payload = selectedPayload;
  if (!payload || payload.error) return;
  const events = unifiedEventsFromPayload(payload);
  const filters = detailEl.querySelector(".kind-filters");
  const body = detailEl.querySelector("#timeline-body");
  if (filters) filters.outerHTML = renderKindFilters(events);
  if (body) body.innerHTML = renderTimeline(events);
}

detailEl.addEventListener("click", (ev) => {
  const parentBtn = ev.target.closest("[data-select-parent]");
  if (parentBtn && detailEl.contains(parentBtn) && selectedId) {
    selectRun(selectedId, { agentId: null, quiet: true });
    return;
  }

  const agentBtn = ev.target.closest("[data-select-agent]");
  if (agentBtn && detailEl.contains(agentBtn) && selectedId) {
    selectRun(selectedId, { agentId: agentBtn.getAttribute("data-select-agent"), quiet: true });
    return;
  }

  const clearBtn = ev.target.closest("[data-kind-filter-clear]");
  if (clearBtn && detailEl.contains(clearBtn)) {
    timelineKindsOn.clear();
    refreshTimelineFilters();
    return;
  }

  const kindBtn = ev.target.closest("[data-kind-filter]");
  if (kindBtn && detailEl.contains(kindBtn)) {
    const kind = kindBtn.getAttribute("data-kind-filter");
    if (!kind) return;
    if (timelineKindsOn.has(kind)) timelineKindsOn.delete(kind);
    else timelineKindsOn.add(kind);
    refreshTimelineFilters();
    return;
  }

  const btn = ev.target.closest("[data-section-toggle]");
  if (!btn || !detailEl.contains(btn)) return;
  const key = btn.getAttribute("data-section-toggle");
  if (!key) return;
  sectionCollapsed[key] = !sectionCollapsed[key];
  const collapsed = sectionCollapsed[key];
  const block = btn.closest(".collapsible-block");
  const body = block?.querySelector(".section-toggle-body");
  if (!block || !body) return;
  block.classList.toggle("is-collapsed", collapsed);
  body.hidden = collapsed;
  btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
});

function setListCollapsed(collapsed) {
  if (!layoutEl || !listToggle) return;
  layoutEl.classList.toggle("list-collapsed", collapsed);
  listToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  listToggle.setAttribute("title", collapsed ? "Mostrar lista" : "Ocultar lista");
  try {
    localStorage.setItem(LIST_COLLAPSE_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

if (listToggle) {
  listToggle.addEventListener("click", () => {
    setListCollapsed(!layoutEl.classList.contains("list-collapsed"));
  });
}

try {
  setListCollapsed(localStorage.getItem(LIST_COLLAPSE_KEY) === "1");
} catch {
  /* ignore */
}

function bindFloatTip() {
  const tip = document.getElementById("float-tip");
  if (!tip) return;

  function hide() {
    tip.hidden = true;
    const prev = document.querySelector("[aria-describedby='float-tip']");
    if (prev) prev.removeAttribute("aria-describedby");
  }

  function show(host) {
    const text = host.getAttribute("data-tip");
    if (!text) return;
    hide();
    tip.textContent = text;
    tip.hidden = false;
    host.setAttribute("aria-describedby", "float-tip");
    const r = host.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = r.top - th - 8;
    if (top < 8) top = r.bottom + 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  document.addEventListener("pointerover", (ev) => {
    const host = ev.target.closest("[data-tip]");
    if (host) show(host);
  });
  document.addEventListener("pointerout", (ev) => {
    const host = ev.target.closest("[data-tip]");
    if (!host) return;
    if (host.contains(ev.relatedTarget)) return;
    hide();
  });
  document.addEventListener("focusin", (ev) => {
    const host = ev.target.closest("[data-tip]");
    if (host) show(host);
  });
  document.addEventListener("focusout", (ev) => {
    const host = ev.target.closest("[data-tip]");
    if (!host) return;
    if (host.contains(ev.relatedTarget)) return;
    hide();
  });
  window.addEventListener("scroll", hide, true);
}

bindFloatTip();
connectLive();
loadRuns().catch((err) => {
  emptyEl.classList.add("hidden");
  detailEl.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
});
