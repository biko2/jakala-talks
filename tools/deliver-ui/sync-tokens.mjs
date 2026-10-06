#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyHookUsage,
  defaultTranscriptsDir,
  enrichRunWithHook,
  listTranscriptIds,
  readHookTurns,
  resolveSessionId,
} from "./hook.mjs";
import { parseRunContent, runIdFromFilename } from "./reader.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const runsDir = join(repoRoot, ".deliver", "runs");
const usageHome = join(homedir(), ".cursor");
const transcriptsDir = defaultTranscriptsDir(repoRoot);
const askedPath = join(repoRoot, ".deliver", "hook-asked.json");

function latestRunFile() {
  if (!existsSync(runsDir)) return null;
  const files = readdirSync(runsDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse();
  return files[0] ? join(runsDir, files[0]) : null;
}

function resolveFile(arg) {
  if (!arg) return latestRunFile();
  if (arg.endsWith(".json") && existsSync(arg)) return arg;
  const byId = join(runsDir, `${runIdFromFilename(arg)}.json`);
  return existsSync(byId) ? byId : null;
}

const target = resolveFile(process.argv[2]);
if (!target) {
  console.error("No hay run en .deliver/runs/. Pasa un id o ruta.");
  process.exit(1);
}

const parsed = parseRunContent(readFileSync(target, "utf8"), runIdFromFilename(target));
if (!parsed.ok) {
  console.error(parsed.error);
  process.exit(1);
}

const sessionId = resolveSessionId(parsed.data, {
  usageHome,
  transcriptIds: listTranscriptIds(transcriptsDir),
});
if (!sessionId) {
  console.error("Hook sin conversaciones. Instala el hook y completa un turno en Cursor.");
  process.exit(2);
}

const turns = readHookTurns(usageHome, sessionId);
const applied = applyHookUsage(parsed.data, turns);
if (!applied.applied) {
  console.error(`Hook sin turnos para ${sessionId}. Completa un turno en Cursor.`);
  process.exit(3);
}

const next = enrichRunWithHook(applied.run, usageHome, transcriptsDir);
writeFileSync(target, `${JSON.stringify(next, null, 2)}\n`);
if (!existsSync(dirname(askedPath))) mkdirSync(dirname(askedPath), { recursive: true });
console.log(
  `OK ${runIdFromFilename(target)} · sesión ${next.traces?.sessionId || sessionId} · tokens ${next.tokens.values.total ?? "parcial"} · subtotal $${next.cost.subtotalUsd ?? "null"} · padre only`
);
