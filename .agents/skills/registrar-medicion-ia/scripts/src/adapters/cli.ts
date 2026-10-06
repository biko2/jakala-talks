import { readFile } from "node:fs/promises";
import type { Harness } from "../domain/model.ts";
import { analyzeTraces } from "../application/analyze-traces.ts";
import { buildTaskTrace, type SliceSelection } from "../application/build-task-trace.ts";
import { inspectUserMessages } from "../application/inspect-user-messages.ts";

const harnesses = new Set<Harness>(["codex", "claude-code", "cursor", "opencode"]);

function option(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? null : null;
}

function repeatedOption(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) if (args[index] === name && args[index + 1]) values.push(args[index + 1]!);
  return values;
}

function positiveInteger(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Valor inválido: ${raw}`);
  return value;
}

function harnessValue(raw: string | null, allowAll: boolean): Harness | "all" {
  if (raw === null) return allowAll ? "all" : "codex";
  if (allowAll && raw === "all") return raw;
  if (harnesses.has(raw as Harness)) return raw as Harness;
  throw new Error(`Arnés no admitido: ${raw}`);
}

function parseSlice(raw: string): SliceSelection {
  const [harness, sessionId, from, to, ...extra] = raw.split(",");
  if (extra.length > 0 || !harness || !sessionId || !from || (!harnesses.has(harness as Harness))) {
    throw new Error(`Slice inválido: ${raw}. Usa harness,sessionId,desde[,hasta]`);
  }
  const fromMessage = Number(from);
  const toMessage = to ? Number(to) : null;
  if (!Number.isInteger(fromMessage) || fromMessage < 0 || (toMessage !== null && (!Number.isInteger(toMessage) || toMessage < fromMessage))) {
    throw new Error(`Intervalo inválido: ${raw}`);
  }
  return { harness: harness as Harness, sessionId, fromMessage, toMessage };
}

function singleHome(harness: Harness | "all", home: string | null): Partial<Record<Harness, string>> | undefined {
  if (!home) return undefined;
  if (harness === "all") throw new Error("--home requiere seleccionar un único --harness");
  return { [harness]: home };
}

export async function runCli(args: string[]): Promise<unknown> {
  const [command, ...rest] = args;
  if (command === "analyze") {
    const harness = harnessValue(option(rest, "--harness"), true);
    const homes = singleHome(harness, option(rest, "--home"));
    return analyzeTraces({
      harness,
      project: option(rest, "--project"),
      limit: positiveInteger(option(rest, "--limit"), 4),
      ...(homes ? { homes } : {}),
    });
  }
  if (command === "inspect-user-messages") {
    const harness = harnessValue(option(rest, "--harness"), true);
    const homes = singleHome(harness, option(rest, "--home"));
    return inspectUserMessages({
      harness,
      project: option(rest, "--project"),
      limit: positiveInteger(option(rest, "--limit"), 20),
      ...(homes ? { homes } : {}),
    });
  }
  if (command === "build-task-trace") {
    const reportPath = rest.find((value, index) => !value.startsWith("-") && rest[index - 1] !== "--slice" && rest[index - 1] !== "--manual-skill" && rest[index - 1] !== "--automatic-skill" && rest[index - 1] !== "--completed-skill");
    if (!reportPath) throw new Error("Falta la ruta del informe");
    const report: unknown = JSON.parse(await readFile(reportPath, "utf8"));
    const slices = repeatedOption(rest, "--slice").map(parseSlice);
    if (slices.length === 0) throw new Error("Se necesita al menos un --slice");
    return buildTaskTrace({
      report,
      slices,
      manualSkills: repeatedOption(rest, "--manual-skill"),
      automaticSkills: repeatedOption(rest, "--automatic-skill"),
      completedSkills: repeatedOption(rest, "--completed-skill"),
    });
  }
  throw new Error("Uso: trace-analyzer.ts <analyze|inspect-user-messages|build-task-trace> [opciones]");
}
