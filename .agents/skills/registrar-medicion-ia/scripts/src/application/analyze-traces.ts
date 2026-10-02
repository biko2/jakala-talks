import { homedir } from "node:os";
import { join } from "node:path";
import type { AnalysisReport, AnalyzeRequest, Harness } from "../domain/model.ts";
import { SCHEMA_VERSION } from "../domain/model.ts";
import type { HarnessAdapter } from "../ports/harness-adapter.ts";
import { analyzeCodex } from "../adapters/codex.ts";
import { analyzeClaude } from "../adapters/claude.ts";
import { analyzeCursor } from "../adapters/cursor.ts";
import { analyzeOpenCode } from "../adapters/opencode.ts";

function adapter(harness: Harness, analyze: HarnessAdapter["analyze"]): HarnessAdapter {
  return { harness, analyze };
}

export const harnessAdapters: Record<Harness, HarnessAdapter> = {
  codex: adapter("codex", analyzeCodex),
  "claude-code": adapter("claude-code", analyzeClaude),
  cursor: adapter("cursor", analyzeCursor),
  opencode: adapter("opencode", analyzeOpenCode),
};

export const defaultHomes: Record<Harness, string> = {
  codex: join(homedir(), ".codex"),
  "claude-code": join(homedir(), ".claude"),
  cursor: join(homedir(), ".cursor"),
  opencode: join(homedir(), ".local", "share", "opencode"),
};

export interface AnalyzeTracesRequest {
  harness: Harness | "all";
  project: string | null;
  limit: number;
  homes?: Partial<Record<Harness, string>>;
}

export interface CombinedAnalysisReport {
  schemaVersion: typeof SCHEMA_VERSION;
  generatedAt: string;
  project: string | null;
  reports: AnalysisReport[];
}

export async function analyzeTraces(request: AnalyzeTracesRequest): Promise<AnalysisReport | CombinedAnalysisReport> {
  if (request.harness !== "all") {
    const adapter = harnessAdapters[request.harness];
    const adapterRequest: AnalyzeRequest = {
      home: request.homes?.[request.harness] ?? defaultHomes[request.harness],
      project: request.project,
      limit: request.limit,
    };
    return adapter.analyze(adapterRequest);
  }
  const harnesses = Object.keys(harnessAdapters) as Harness[];
  const reports = await Promise.all(harnesses.map((harness) => harnessAdapters[harness].analyze({
    home: request.homes?.[harness] ?? defaultHomes[harness],
    project: request.project,
    limit: request.limit,
  })));
  return { schemaVersion: SCHEMA_VERSION, generatedAt: new Date().toISOString(), project: request.project, reports };
}
