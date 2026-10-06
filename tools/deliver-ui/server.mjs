import { createServer } from "node:http";
import { readFileSync, existsSync, watch, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultTranscriptsDir } from "./hook.mjs";
import { listRuns, getRun, runIdFromFilename } from "./reader.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const RUNS_DIR = join(REPO_ROOT, ".deliver", "runs");
const CURSOR_HOME = join(homedir(), ".cursor");
const TRANSCRIPTS_DIR = defaultTranscriptsDir(REPO_ROOT);
const PUBLIC_DIR = join(__dirname, "public");
const HOST = "127.0.0.1";
const PORT = 4177;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

/** @type {Set<import('node:http').ServerResponse>} */
const sseClients = new Set();

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function sendFile(res, filePath) {
  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = extname(filePath);
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(readFileSync(filePath));
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function attachSse(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
}

function handleApi(req, res, url) {
  if (url.pathname === "/api/events") {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return true;
    }
    attachSse(req, res);
    return true;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return true;
  }

  if (url.pathname === "/api/runs") {
    sendJson(res, 200, { runs: listRuns(RUNS_DIR, CURSOR_HOME, TRANSCRIPTS_DIR), runsDir: RUNS_DIR });
    return true;
  }

  const detail = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (detail) {
    const id = decodeURIComponent(detail[1]);
    const result = getRun(RUNS_DIR, id, CURSOR_HOME, TRANSCRIPTS_DIR);
    if (!result.ok) {
      sendJson(res, result.status || 500, { error: result.error, id: result.id });
      return true;
    }
    sendJson(res, 200, {
      id: result.id,
      run: result.data,
      timeline: result.timeline,
      events: result.events,
      cost: result.cost,
      timing: result.timing,
      modelTitle: result.modelTitle,
    });
    return true;
  }

  return false;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (handleApi(req, res, url)) return;

  if (url.pathname === "/" || url.pathname === "/index.html") {
    sendFile(res, join(PUBLIC_DIR, "index.html"));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    const safe = url.pathname.replace(/\.\./g, "");
    sendFile(res, join(PUBLIC_DIR, safe.slice(1)));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

function startWatcher() {
  if (!existsSync(RUNS_DIR)) {
    mkdirSync(RUNS_DIR, { recursive: true });
  }

  let debounce = null;
  /** @type {Set<string>} */
  const changedIds = new Set();

  const flush = () => {
    const ids = [...changedIds];
    changedIds.clear();
    debounce = null;
    broadcast("runs-changed", { ids });
    for (const id of ids) {
      if (id) broadcast("run-changed", { id });
    }
  };

  watch(RUNS_DIR, { persistent: true }, (_eventType, filename) => {
    if (!filename || !String(filename).endsWith(".json")) {
      changedIds.add("");
    } else {
      changedIds.add(runIdFromFilename(String(filename)));
    }
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(flush, 120);
  });
}

server.listen(PORT, HOST, () => {
  startWatcher();
  console.log(`Deliver UI → http://${HOST}:${PORT}`);
  console.log(`Runs dir   → ${RUNS_DIR}`);
  console.log(`Live SSE   → http://${HOST}:${PORT}/api/events`);
});
