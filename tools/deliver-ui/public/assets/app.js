const listEl = document.getElementById("bitacora-list");
const emptyEl = document.getElementById("empty");
const detailEl = document.getElementById("detail");
const filterState = document.getElementById("filter-state");
const filterOrigin = document.getElementById("filter-origin");
const refreshBtn = document.getElementById("refresh");
const layoutEl = document.getElementById("layout");
const listToggle = document.getElementById("toggle-list");
const LIST_COLLAPSE_KEY = "deliver-ui-list-collapsed";

/** @type {any[]} */
let bitacoras = [];
/** @type {string | null} */
let selectedSlug = null;

const BITACORA_STATE = [
  ["siguientePaso", "Siguiente paso exacto"],
  ["bloqueos", "Bloqueos"],
  ["enCurso", "En curso"],
  ["completado", "Completado"],
];

const BITACORA_SECTIONS = [
  ["objetivo", "Objetivo y alcance"],
  ["artefactos", "Artefactos y verificación"],
  ["hitos", "Hitos"],
  ["decisiones", "Decisiones"],
  ["aprendizajes", "Aprendizajes verificados"],
  ["errores", "Errores y correcciones"],
  ["preguntas", "Preguntas abiertas"],
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Escaped text with http(s) URLs turned into links. */
function linkify(text) {
  return escapeHtml(text).replace(
    /https?:\/\/[^\s<>)]+/g,
    (url) => `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`
  );
}

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

function stateLabel(item) {
  return item.closed ? "cerrada" : "abierta";
}

function originLabel(item) {
  return item.workflow === "deliver" ? "/deliver" : "suelta";
}

function filteredBitacoras() {
  const state = filterState.value;
  const origin = filterOrigin.value;
  return bitacoras.filter((item) => {
    if (state === "open" && item.closed) return false;
    if (state === "closed" && !item.closed) return false;
    if (origin === "deliver" && item.workflow !== "deliver") return false;
    if (origin === "loose" && item.workflow === "deliver") return false;
    return true;
  });
}

function renderList() {
  const items = filteredBitacoras();
  emptyEl.classList.toggle("hidden", bitacoras.length > 0);
  listEl.innerHTML = "";

  for (const item of items) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `run-item${selectedSlug === item.slug ? " active" : ""}${item.closed ? " is-closed" : ""}`;
    const sub = item.closed
      ? `cerrada · ${formatWhen(item.updatedAt)}`
      : item.siguientePaso
        ? `→ ${item.siguientePaso}`
        : formatWhen(item.updatedAt);
    btn.innerHTML = `
      <div class="run-title">${escapeHtml(item.title || item.slug)}</div>
      <div class="when">${escapeHtml(originLabel(item))} · ${escapeHtml(sub)}</div>
    `;
    btn.addEventListener("click", () => selectBitacora(item.slug));
    li.appendChild(btn);
    listEl.appendChild(li);
  }

  if (bitacoras.length > 0 && items.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Ninguna bitácora coincide con el filtro.";
    listEl.appendChild(p);
  }
}

function bitacoraText(text) {
  return text
    ? `<pre class="bitacora-text">${linkify(text)}</pre>`
    : `<p class="muted">—</p>`;
}

function renderState(state) {
  if (!state) return `<p class="muted">Sin sección «Estado actual».</p>`;
  return `<dl class="bitacora-state">${BITACORA_STATE.map(([key, label]) => {
    const classes = [
      "bitacora-state-row",
      key === "siguientePaso" ? "is-next" : "",
      key === "bloqueos" && state[key] ? "is-blocked" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<div class="${classes}"><dt>${escapeHtml(label)}</dt><dd>${bitacoraText(state[key])}</dd></div>`;
  }).join("")}</dl>`;
}

function renderDetail(slug, payload) {
  if (!payload) {
    detailEl.innerHTML = `<p class="placeholder">Elige una bitácora de la lista.</p>`;
    return;
  }
  if (payload.error) {
    detailEl.innerHTML = `<h2>${escapeHtml(slug)}</h2><div class="error-box">${escapeHtml(payload.error)}</div>`;
    return;
  }

  const sections = payload.data?.sections || {};
  const rest = BITACORA_SECTIONS.filter(([key]) => sections[key])
    .map(
      ([key, label]) =>
        `<section class="block bitacora-section"><h3>${escapeHtml(label)}</h3>${bitacoraText(sections[key])}</section>`
    )
    .join("");

  detailEl.innerHTML = `
    <div class="task-heading">
      <p class="task-id-row">
        <span class="task-id">${escapeHtml(originLabel(payload))}</span>
        <span class="pill ${payload.closed ? "ok" : "warn"}">${escapeHtml(stateLabel(payload))}</span>
      </p>
      <h2>${escapeHtml(payload.data?.title || slug)}</h2>
    </div>
    <p class="sub">${escapeHtml(formatWhen(payload.updatedAt))} · <code>${escapeHtml(payload.path)}</code> · <span class="live-dot" title="escuchando cambios del fichero">live</span></p>
    <section class="block"><h3>Estado actual</h3>${renderState(sections.estadoActual)}</section>
    ${rest || `<p class="muted">Sin más secciones todavía.</p>`}
  `;
}

async function selectBitacora(slug, { quiet } = {}) {
  selectedSlug = slug;
  renderList();
  if (!quiet) detailEl.innerHTML = `<p class="placeholder">Cargando…</p>`;
  try {
    const res = await fetch(`/api/bitacoras/${encodeURIComponent(slug)}`);
    const body = await res.json();
    if (selectedSlug !== slug) return;
    renderDetail(slug, res.ok ? body : { error: body.error || res.statusText });
  } catch (err) {
    if (selectedSlug !== slug) return;
    renderDetail(slug, { error: err instanceof Error ? err.message : "Error de red" });
  }
}

async function loadBitacoras() {
  const res = await fetch("/api/bitacoras");
  if (!res.ok) throw new Error(`No se pudo cargar /api/bitacoras (${res.status})`);
  const body = await res.json();
  bitacoras = Array.isArray(body.bitacoras) ? body.bitacoras : [];
  renderList();

  if (selectedSlug && bitacoras.some((item) => item.slug === selectedSlug)) return;
  const first = filteredBitacoras()[0] || bitacoras[0];
  if (first) {
    await selectBitacora(first.slug);
  } else {
    selectedSlug = null;
    renderDetail(null, null);
  }
}

function connectLive() {
  const eventSource = new EventSource("/api/events");
  eventSource.addEventListener("bitacoras-changed", (ev) => {
    let slugs = [];
    try {
      slugs = JSON.parse(ev.data).slugs || [];
    } catch {
      slugs = [];
    }
    loadBitacoras()
      .then(() => {
        if (selectedSlug && slugs.includes(selectedSlug)) {
          return selectBitacora(selectedSlug, { quiet: true });
        }
        return undefined;
      })
      .catch(console.error);
  });
}

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

refreshBtn.addEventListener("click", () => {
  loadBitacoras().catch((err) => {
    detailEl.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  });
});
filterState.addEventListener("change", renderList);
filterOrigin.addEventListener("change", renderList);

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

connectLive();
loadBitacoras().catch((err) => {
  emptyEl.classList.add("hidden");
  detailEl.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
});
