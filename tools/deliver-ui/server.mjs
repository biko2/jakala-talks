import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { listRuns, getRun } from "./reader.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const RUNS_DIR = join(REPO_ROOT, ".deliver", "runs");
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

function handleApi(req, res, url) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return true;
  }

  if (url.pathname === "/api/runs") {
    sendJson(res, 200, { runs: listRuns(RUNS_DIR), runsDir: RUNS_DIR });
    return true;
  }

  const detail = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (detail) {
    const id = decodeURIComponent(detail[1]);
    const result = getRun(RUNS_DIR, id);
    if (!result.ok) {
      sendJson(res, result.status || 500, { error: result.error, id: result.id });
      return true;
    }
    sendJson(res, 200, { id: result.id, run: result.data });
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

server.listen(PORT, HOST, () => {
  console.log(`Deliver UI → http://${HOST}:${PORT}`);
  console.log(`Runs dir   → ${RUNS_DIR}`);
});
