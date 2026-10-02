const listEl = document.getElementById("run-list");
const emptyEl = document.getElementById("empty");
const detailEl = document.getElementById("detail");
const filterModel = document.getElementById("filter-model");
const filterCi = document.getElementById("filter-ci");
const refreshBtn = document.getElementById("refresh");

/** @type {any[]} */
let runs = [];
let selectedId = null;

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

function renderList() {
  const items = filteredRuns();
  emptyEl.classList.toggle("hidden", runs.length > 0);
  listEl.innerHTML = "";

  for (const run of items) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `run-item${run.id === selectedId ? " active" : ""}${run.valid ? "" : " invalid"}`;
    btn.dataset.id = run.id;

    if (!run.valid) {
      btn.innerHTML = `
        <div class="row">
          <span class="model">${escapeHtml(run.id)}</span>
          <span class="pill bad">inválido</span>
        </div>
        <div class="meta"><span class="pill">${escapeHtml(run.error || "error")}</span></div>
      `;
    } else {
      btn.innerHTML = `
        <div class="row">
          <span class="model">${escapeHtml(run.model || "modelo desconocido")}</span>
          <span class="when">${escapeHtml(formatWhen(run.recordedAt))}</span>
        </div>
        <div class="meta">
          <span class="pill">${escapeHtml(modeLabel(run.mode))}</span>
          <span class="pill ${ciClass(run.ciStatus)}">CI ${escapeHtml(run.ciStatus)}</span>
          <span class="pill">acept. ${escapeHtml(acceptanceLabel(run.acceptanceMet, run.acceptanceTotal))}</span>
          <span class="pill">tok ${escapeHtml(tokensLabel(run.tokensTotal))}</span>
          ${
            run.parentIssue
              ? `<span class="pill">#${run.parentIssue.number}</span>`
              : ""
          }
          ${run.pr ? `<span class="pill">PR #${run.pr.number}</span>` : ""}
        </div>
      `;
    }

    btn.addEventListener("click", () => selectRun(run.id));
    li.appendChild(btn);
    listEl.appendChild(li);
  }

  if (runs.length > 0 && items.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Ninguna ejecución coincide con el filtro.";
    listEl.appendChild(p);
  }
}

function barRows(map) {
  const entries = Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return `<p class="muted">Sin datos</p>`;
  }
  const max = Math.max(...entries.map(([, n]) => n), 1);
  return `<div class="bars">${entries
    .map(
      ([name, count]) => `
      <div class="bar-row">
        <span title="${escapeHtml(name)}">${escapeHtml(name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
        <span>${count}</span>
      </div>`
    )
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

function renderDetail(id, payload) {
  if (!payload) {
    detailEl.innerHTML = `<p class="placeholder">Elige una ejecución de la lista.</p>`;
    return;
  }

  if (payload.error) {
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

  const links = [];
  if (run.parentIssue?.url) {
    links.push(`<a href="${escapeHtml(run.parentIssue.url)}" target="_blank" rel="noreferrer">Spec #${run.parentIssue.number}</a>`);
  }
  for (const t of run.ticketIssues || []) {
    if (t?.url) {
      links.push(`<a href="${escapeHtml(t.url)}" target="_blank" rel="noreferrer">Ticket #${t.number}</a>`);
    }
  }
  if (run.pr?.url) {
    links.push(`<a href="${escapeHtml(run.pr.url)}" target="_blank" rel="noreferrer">PR #${run.pr.number}</a>`);
  }

  detailEl.innerHTML = `
    <h2>${escapeHtml(run.model || "modelo desconocido")}</h2>
    <p class="sub">${escapeHtml(formatWhen(run.recordedAt))} · <code>${escapeHtml(id)}</code></p>

    <div class="grid">
      <div class="stat"><span class="label">Modo</span><span class="value">${escapeHtml(modeLabel(run.mode))}</span></div>
      <div class="stat"><span class="label">Harness</span><span class="value">${escapeHtml(run.harness || "—")}</span></div>
      <div class="stat"><span class="label">Rama</span><span class="value"><code>${escapeHtml(run.branch || "—")}</code></span></div>
      <div class="stat"><span class="label">CI</span><span class="value">${escapeHtml(ci.status || "unknown")}</span></div>
      <div class="stat"><span class="label">Criterios</span><span class="value">${escapeHtml(acceptanceLabel(acceptance.met ?? null, acceptance.total ?? null))}</span></div>
      <div class="stat"><span class="label">Tokens</span><span class="value">${escapeHtml(tokensLabel(values.total ?? null))}</span></div>
    </div>

    <section class="block">
      <h3>Paradas humanas</h3>
      <div>${gatePills(run.humanGates)}</div>
    </section>

    <section class="block">
      <h3>Enlaces</h3>
      <div class="links">${links.length ? links.join("") : `<span class="muted">Sin enlaces</span>`}</div>
    </section>

    <section class="block">
      <h3>CI fallidos</h3>
      ${
        Array.isArray(ci.checksFailed) && ci.checksFailed.length
          ? `<ul class="gaps">${ci.checksFailed.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
          : `<p class="muted">Ninguno</p>`
      }
    </section>

    <section class="block">
      <h3>Huecos de spec</h3>
      ${
        gaps.length
          ? `<ul class="gaps">${gaps
              .map(
                (g) =>
                  `<li><span class="pill ${g.status === "missing" || g.status === "wrong" ? "bad" : "warn"}">${escapeHtml(g.status || "?")}</span> ${escapeHtml(g.requirement || "")}</li>`
              )
              .join("")}</ul>`
          : `<p class="muted">Ninguno</p>`
      }
    </section>

    <section class="block">
      <h3>Tokens <span class="muted">(${escapeHtml(tokens.scope || "parent-only")} · cobertura ${escapeHtml(tokens.coverage || "unknown")})</span></h3>
      <div class="grid">
        <div class="stat"><span class="label">input</span><span class="value">${escapeHtml(tokensLabel(values.input ?? null))}</span></div>
        <div class="stat"><span class="label">output</span><span class="value">${escapeHtml(tokensLabel(values.output ?? null))}</span></div>
        <div class="stat"><span class="label">cached</span><span class="value">${escapeHtml(tokensLabel(values.cachedInput ?? null))}</span></div>
        <div class="stat"><span class="label">cache write</span><span class="value">${escapeHtml(tokensLabel(values.cacheWriteInput ?? null))}</span></div>
        <div class="stat"><span class="label">reasoning</span><span class="value">${escapeHtml(tokensLabel(values.reasoningOutput ?? null))}</span></div>
        <div class="stat"><span class="label">total</span><span class="value">${escapeHtml(tokensLabel(values.total ?? null))}</span></div>
      </div>
      ${run.notes ? `<p class="muted">${escapeHtml(run.notes)}</p>` : ""}
    </section>

    <section class="block">
      <h3>Tools</h3>
      ${barRows(run.tools)}
    </section>

    <section class="block">
      <h3>Categorías</h3>
      ${barRows(run.toolCategories)}
    </section>

    <section class="block">
      <h3>Skills</h3>
      ${barRows(
        Object.fromEntries(
          Object.entries(run.skills || {}).map(([name, info]) => {
            if (typeof info === "number") return [name, info];
            if (info && typeof info === "object") {
              const n =
                (info.activityAttributed || 0) +
                (info.loaded || 0) +
                (info.completed || 0) +
                (info.manuallyInvoked || 0);
              return [name, n];
            }
            return [name, 0];
          })
        )
      )}
    </section>
  `;
}

async function selectRun(id) {
  selectedId = id;
  renderList();
  detailEl.innerHTML = `<p class="placeholder">Cargando…</p>`;
  try {
    const res = await fetch(`/api/runs/${encodeURIComponent(id)}`);
    const body = await res.json();
    if (!res.ok) {
      renderDetail(id, { error: body.error || res.statusText });
      return;
    }
    renderDetail(id, body);
  } catch (err) {
    renderDetail(id, {
      error: err instanceof Error ? err.message : "Error de red",
    });
  }
}

async function loadRuns() {
  const res = await fetch("/api/runs");
  if (!res.ok) throw new Error(`No se pudo cargar /api/runs (${res.status})`);
  const body = await res.json();
  runs = Array.isArray(body.runs) ? body.runs : [];
  fillModelFilter();
  renderList();
  if (selectedId && runs.some((r) => r.id === selectedId)) {
    await selectRun(selectedId);
  } else if (!selectedId && runs.length > 0) {
    const firstValid = runs.find((r) => r.valid) || runs[0];
    await selectRun(firstValid.id);
  } else {
    selectedId = null;
    renderDetail(null, null);
  }
}

refreshBtn.addEventListener("click", () => {
  loadRuns().catch((err) => {
    detailEl.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  });
});
filterModel.addEventListener("change", renderList);
filterCi.addEventListener("change", renderList);

loadRuns().catch((err) => {
  emptyEl.classList.add("hidden");
  detailEl.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
});
