import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

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
      mode: null,
      ciStatus: "unknown",
      acceptanceMet: null,
      acceptanceTotal: null,
      tokensTotal: null,
      parentIssue: null,
      pr: null,
      branch: null,
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

  return {
    id,
    valid: true,
    error: null,
    recordedAt: typeof data.recordedAt === "string" ? data.recordedAt : null,
    model: typeof data.model === "string" ? data.model : data.model === null ? null : null,
    mode: typeof data.mode === "string" ? data.mode : null,
    ciStatus:
      ci && typeof ci.status === "string" ? ci.status : "unknown",
    acceptanceMet: acceptance ? nullableNumber(acceptance.met) : null,
    acceptanceTotal: acceptance ? nullableNumber(acceptance.total) : null,
    tokensTotal: values ? nullableNumber(values.total) : null,
    parentIssue:
      parent && typeof parent.number === "number"
        ? { number: parent.number, url: typeof parent.url === "string" ? parent.url : null }
        : null,
    pr:
      pr && typeof pr.number === "number"
        ? { number: pr.number, url: typeof pr.url === "string" ? pr.url : null }
        : null,
    branch: typeof data.branch === "string" ? data.branch : null,
  };
}

/**
 * @param {string} runsDir
 * @returns {ReturnType<typeof toListItem>[]}
 */
export function listRuns(runsDir) {
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
    return toListItem(parseRunContent(raw, id));
  });
}

/**
 * @param {string} runsDir
 * @param {string} id
 * @returns {{ ok: true, id: string, data: object } | { ok: false, id: string, error: string, status: number }}
 */
export function getRun(runsDir, id) {
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
  return parsed;
}
