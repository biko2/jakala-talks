import { mkdir, copyFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { asRecord, isRecord } from "./src/shared/unknown.ts";

// Run from the installed skill so updates keep the hook's target stable.
const home = join(homedir(), ".cursor");
const path = join(home, "hooks.json");
await mkdir(home, { recursive: true });
const file = Bun.file(path);
const exists = await file.exists();
const raw: unknown = exists ? await file.json() : { version: 1, hooks: {} };
if (!isRecord(raw) || (raw.hooks !== undefined && !isRecord(raw.hooks))) throw new Error("Configuración de hooks inválida; no se modifica.");
const hooks = asRecord(raw.hooks);
if (hooks.stop !== undefined && !Array.isArray(hooks.stop)) throw new Error("hooks.stop no es una lista; no se modifica.");
const stop: unknown[] = Array.isArray(hooks.stop) ? hooks.stop : [];
const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
const command = `${quote(process.execPath)} ${quote(join(import.meta.dir, "cursor-usage-hook.ts"))}`;
if (!stop.some(entry => asRecord(entry).command === command)) {
  if (exists) await copyFile(path, `${path}.ai-hub-${Date.now()}.bak`);
  await Bun.write(`${path}.ai-hub.tmp`, JSON.stringify({ ...raw, hooks: { ...hooks, stop: [...stop, { command }] } }, null, 2) + "\n");
  await rename(`${path}.ai-hub.tmp`, path);
}
console.log(`Hook stop instalado en ${path}. Captura local; no envía fichas.`);
