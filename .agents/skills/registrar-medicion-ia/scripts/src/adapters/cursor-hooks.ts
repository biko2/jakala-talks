import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { safeCursorValues, type CursorTurnUsage } from "../domain/cursor-usage.ts";
import { findFiles } from "../infrastructure/files.ts";
import { asRecord, asString } from "../shared/unknown.ts";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function directory(home: string, conversation: string) {
  return join(home, "ai-hub-usage", digest(conversation));
}
// One atomic file per generation makes repeated stop delivery idempotent.
// Only allowlisted counters leave the hook process; never persist its text payload.
export async function captureCursorUsage(home: string, payload: unknown): Promise<boolean> {
  const event = asRecord(payload);
  const conversationId = asString(event.conversation_id);
  const generationId = asString(event.generation_id);
  if (event.hook_event_name !== "stop" || !conversationId || !generationId) return false;
  const row = {
    conversationId, generationId,
    model: asString(event.model_id) ?? asString(event.model),
    recordedAt: new Date().toISOString(),
    values: safeCursorValues({ input: event.input_tokens, output: event.output_tokens, cachedInput: event.cache_read_tokens, cacheWriteInput: event.cache_write_tokens }),
  };
  const folder = directory(home, conversationId);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const destination = join(folder, `${digest(generationId)}.json`);
  // A repeated event without counters must not erase an earlier observation.
  const previous = Bun.file(destination);
  if (await previous.exists()) {
    const old = asRecord(await previous.json());
    const values = safeCursorValues(old.values);
    row.values = safeCursorValues({ input: row.values.input ?? values.input, output: row.values.output ?? values.output, cachedInput: row.values.cachedInput ?? values.cachedInput, cacheWriteInput: row.values.cacheWriteInput ?? values.cacheWriteInput });
    row.model ??= asString(old.model);
  }
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await Bun.write(temporary, JSON.stringify(row), { mode: 0o600 });
  await rename(temporary, destination);
  return true;
}

export async function readCursorUsage(home: string, sessionId: string): Promise<CursorTurnUsage[]> {
  const turns: CursorTurnUsage[] = [];
  for (const path of await findFiles(directory(home, sessionId), ".json")) {
    try {
      const row = asRecord(await Bun.file(path).json());
      const generationId = asString(row.generationId);
      const recordedAt = asString(row.recordedAt);
      if (row.conversationId !== sessionId || !generationId || !recordedAt) continue;
      turns.push({ generationId, recordedAt, model: asString(row.model), values: safeCursorValues(row.values) });
    } catch { /* Incomplete/corrupt observations are not evidence of zero usage. */ }
  }
  return turns.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

