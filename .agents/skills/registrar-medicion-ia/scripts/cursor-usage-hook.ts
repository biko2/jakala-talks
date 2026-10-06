import { homedir } from "node:os";
import { join } from "node:path";
import { captureCursorUsage } from "./src/adapters/cursor-hooks.ts";

try {
  await captureCursorUsage(join(homedir(), ".cursor"), JSON.parse(await Bun.stdin.text()));
} catch {
  // Fail open: a measurement problem must not block the user's Cursor task.
  console.error("AI Hub: no se pudo guardar el uso de Cursor.");
}
