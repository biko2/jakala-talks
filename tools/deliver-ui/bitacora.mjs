import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** Convention of `.agents/skills/bitacora`, relative to the repo root. */
export const BITACORAS_REL_DIR = ".agents/bitacoras";

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DELIVER_PREFIX = "deliver-";

/** `##` headings of the skill template, matched by normalized prefix. */
const SECTION_KEYS = [
  ["objetivo", "objetivo"],
  ["estado actual", "estadoActual"],
  ["artefactos", "artefactos"],
  ["hitos", "hitos"],
  ["decisiones", "decisiones"],
  ["aprendizajes", "aprendizajes"],
  ["errores", "errores"],
  ["preguntas", "preguntas"],
];

const STATE_KEYS = [
  ["completado", "completado"],
  ["en curso", "enCurso"],
  ["bloqueos", "bloqueos"],
  ["siguiente paso", "siguientePaso"],
];

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchKey(text, table) {
  const norm = normalize(text);
  const hit = table.find(([prefix]) => norm.startsWith(prefix));
  return hit ? hit[1] : null;
}

function blockOrNull(lines) {
  const text = lines.join("\n").replace(/^\s*\n/, "").trimEnd();
  return text.trim() ? text : null;
}

function isSlug(slug) {
  return typeof slug === "string" && SLUG_RE.test(slug) && !slug.includes("..");
}

/**
 * Fields of "Estado actual": `- Label: value`, with indented sub-lines attached.
 * @param {string[]} lines
 */
function parseEstadoActual(lines) {
  /** @type {Record<string, string[]>} */
  const buckets = { completado: [], enCurso: [], bloqueos: [], siguientePaso: [] };
  let current = null;
  for (const line of lines) {
    const top = line.match(/^[-*]\s+([^:]+):\s*(.*)$/);
    const key = top ? matchKey(top[1], STATE_KEYS) : null;
    if (key) {
      current = key;
      if (top[2].trim()) buckets[key].push(top[2].trim());
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      buckets[current].push(line.replace(/^(\t| {1,4})/, ""));
      continue;
    }
    if (line.trim()) current = null;
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([key, value]) => [key, blockOrNull(value)])
  );
}

/**
 * Snapshot of a bitácora written with the `bitacora` skill template.
 * Missing or empty sections are `null`; unknown headings are ignored.
 * @param {string} markdown
 */
export function parseBitacora(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  let title = null;
  let inFence = false;
  let currentKey = null;
  /** @type {Record<string, string[]>} */
  const raw = {};

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;

    if (!inFence) {
      const h1 = line.match(/^#\s+(.+?)\s*#*\s*$/);
      if (h1) {
        if (title === null) {
          title = h1[1].replace(/^bit[aá]cora\s*:\s*/i, "").trim() || null;
        }
        currentKey = null;
        continue;
      }
      const h2 = line.match(/^##\s+(.+?)\s*#*\s*$/);
      if (h2) {
        currentKey = matchKey(h2[1], SECTION_KEYS);
        if (currentKey && raw[currentKey]) raw[currentKey].push("");
        else if (currentKey) raw[currentKey] = [];
        continue;
      }
    }

    if (currentKey) raw[currentKey].push(line);
  }

  /** @type {Record<string, any>} */
  const sections = {};
  for (const [, key] of SECTION_KEYS) {
    if (!raw[key]) {
      sections[key] = null;
    } else if (key === "estadoActual") {
      sections[key] = parseEstadoActual(raw[key]);
    } else {
      sections[key] = blockOrNull(raw[key]);
    }
  }

  return { title, sections };
}

/**
 * Closed when "Siguiente paso exacto" says "ninguno" (close rule of `/deliver`).
 * @param {ReturnType<typeof parseBitacora>} parsed
 */
export function isClosed(parsed) {
  const next = parsed?.sections?.estadoActual?.siguientePaso;
  return typeof next === "string" && normalize(next).startsWith("ninguno");
}

function workflowOf(slug) {
  return slug.startsWith(DELIVER_PREFIX) ? "deliver" : null;
}

function readBitacoraFile(filePath) {
  const markdown = readFileSync(filePath, "utf8");
  return {
    updatedAt: statSync(filePath).mtime.toISOString(),
    data: parseBitacora(markdown),
  };
}

/**
 * @param {string} dir absolute path of `.agents/bitacoras`
 */
export function listBitacoras(dir) {
  if (!existsSync(dir)) return [];
  const items = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const slug = name.slice(0, -3);
    if (!isSlug(slug)) continue;
    const filePath = join(dir, name);
    try {
      if (!statSync(filePath).isFile()) continue;
      const { updatedAt, data } = readBitacoraFile(filePath);
      const state = data.sections.estadoActual;
      items.push({
        slug,
        path: `${BITACORAS_REL_DIR}/${name}`,
        title: data.title,
        updatedAt,
        closed: isClosed(data),
        workflow: workflowOf(slug),
        siguientePaso: state ? state.siguientePaso : null,
        bloqueos: state ? state.bloqueos : null,
      });
    } catch {
      /* unreadable file stays out of the list */
    }
  }
  return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

/**
 * @param {string} dir absolute path of `.agents/bitacoras`
 * @param {string} slug file name without `.md`
 */
export function getBitacora(dir, slug) {
  if (!isSlug(slug)) {
    return { ok: false, slug, error: "slug inválido", status: 400 };
  }
  const filePath = join(dir, `${slug}.md`);
  if (!existsSync(filePath)) {
    return { ok: false, slug, error: "Bitácora no encontrada", status: 404 };
  }
  try {
    const { updatedAt, data } = readBitacoraFile(filePath);
    return {
      ok: true,
      slug,
      path: `${BITACORAS_REL_DIR}/${slug}.md`,
      updatedAt,
      closed: isClosed(data),
      workflow: workflowOf(slug),
      data,
    };
  } catch (err) {
    return {
      ok: false,
      slug,
      error: err instanceof Error ? err.message : "No se pudo leer la bitácora",
      status: 500,
    };
  }
}
