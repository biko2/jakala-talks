import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureCursorUsage } from "../src/adapters/cursor-hooks.ts";
import { analyzeCursor } from "../src/adapters/cursor.ts";
import { buildTaskTrace } from "../src/application/build-task-trace.ts";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

test("captures parent turn counters once, preserves missing fields and excludes private text", async () => {
  const home = await mkdtemp(join(tmpdir(), "cursor-usage-")); roots.push(home);
  const source = join(home, "projects", "project", "agent-transcripts", "conversation");
  await mkdir(source, { recursive: true });
  await writeFile(join(source, "conversation.jsonl"), [0, 1, 2].map(() => JSON.stringify({ role: "user", message: { content: [] } })).join("\n"));
  const event = { hook_event_name: "stop", conversation_id: "conversation", generation_id: "turn-1", model_id: "gpt-6-sol", input_tokens: 400000, output_tokens: 100, cache_read_tokens: 300000, cache_write_tokens: 10000, text: "PRIVATE", user_email: "PRIVATE" };
  await captureCursorUsage(home, event);
  await captureCursorUsage(home, event);
  await captureCursorUsage(home, { ...event, hook_event_name: "afterAgentResponse", generation_id: "ignored" });
  await captureCursorUsage(home, { hook_event_name: "stop", conversation_id: "conversation", generation_id: "turn-2", model_id: "other" });
  const report = await analyzeCursor({ home, project: null, limit: 1 });
  const session = report.sessions[0];
  expect(session?.cursorUsage?.turns).toHaveLength(2);
  expect(session?.cursorUsage?.turns.find(turn => turn.generationId === "turn-1")?.values.input).toBe(400000);
  expect(session?.tokens.input).toBeNull();
  expect(JSON.stringify(session)).not.toContain("PRIVATE");
  const trace = buildTaskTrace({ report, slices: [{ harness: "cursor", sessionId: "conversation", fromMessage: 1, toMessage: 1 }] });
  expect(trace.cursorUsage?.[0]?.scope).toBe("whole-session");
  expect(trace.cursorUsage?.[0]?.transcriptTurns).toBe(3);
  expect(trace.apiCost?.totalUsd).toBeNull();
  expect(trace.apiCost?.totalCalls).toBe(0); // A turn is not a model call.
});

test("rejects invalid counters and identifiers rather than turning them into zero", async () => {
  const home = await mkdtemp(join(tmpdir(), "cursor-usage-")); roots.push(home);
  expect(await captureCursorUsage(home, { hook_event_name: "stop" })).toBeFalse();
  await captureCursorUsage(home, { hook_event_name: "stop", conversation_id: "../../outside", generation_id: "g", input_tokens: -1, output_tokens: 1.5 });
  const files = await Array.fromAsync(new Bun.Glob("**/*.json").scan(home));
  expect(files).toHaveLength(1);
  const saved = JSON.parse(await Bun.file(join(home, files[0]!)).text());
  expect(saved.values.input).toBeNull(); expect(saved.values.output).toBeNull();
});
