import {
  emptySessionSettings,
  extractHookSettings,
  hasSessionSettings,
  mergeSessionSettings,
  safeCursorValues,
  summarizeContextUsage,
  type ContextUsage,
  type CursorUsage,
  type SessionSettings,
} from "../domain/cursor-usage.ts";
import { estimateApiCost, type ApiCost, type TokenCall } from "../domain/api-cost.ts";
import { SCHEMA_VERSION, type FileAction, type Harness, type TokenUsage, type ToolCategory } from "../domain/model.ts";
import { asArray, asNumber, asRecord, asString, isRecord } from "../shared/unknown.ts";

export interface SliceSelection {
  harness: Harness;
  sessionId: string;
  fromMessage: number;
  toMessage: number | null;
}

type SkillMetric = "loaded" | "statusObserved" | "referencesRead" | "scriptsRun" | "manuallyInvoked" | "automaticallySelected" | "completed";

export interface TaskTrace {
  cursorUsage?: Array<CursorUsage & { sessionId: string }>;
  sessionSettings?: SessionSettings;
  contextUsage?: ContextUsage;
  schemaVersion: typeof SCHEMA_VERSION;
  apiCost?: ApiCost;
  generatedAt: string;
  privacy: {
    promptsIncluded: false;
    fileContentsIncluded: false;
    webContentsIncluded: false;
    searchQueriesIncluded: false;
    urlsPreservedVerbatim: true;
  };
  sessionSlices: Array<{
    harness: Harness;
    sessionId: string;
    sourcePath: string | null;
    projectPath: string | null;
    fromMessage: number;
    toMessage: number | null;
    startedAt: string | null;
    endedAt: string | null;
    eventCount: number;
  }>;
  models: string[];
  tokens: Array<{ harness: Harness; sessionId: string; scope: "message-range" | "whole-session"; values: Partial<TokenUsage> }>;
  costs: Array<{ harness: Harness; sessionId: string; scope: "whole-session"; amount: number; currency: "USD" }>;
  tools: Record<string, number>;
  toolCategories: Partial<Record<ToolCategory, number>>;
  skills: Record<string, Partial<Record<SkillMetric, number>>>;
  mcpServers: Record<string, number>;
  files: Array<{ path: string; action: FileAction; kind: string }>;
  webPages: string[];
  coverage: { tokens: "message-range-when-available"; skillLifecycle: "observed-or-unknown"; messageRanges: "observed" };
}

export interface BuildTaskTraceRequest {
  report: unknown;
  slices: SliceSelection[];
  manualSkills?: string[];
  automaticSkills?: string[];
  completedSkills?: string[];
  now?: Date;
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function incrementSkill(skills: TaskTrace["skills"], skill: string, metric: SkillMetric): void {
  const counts = skills[skill] ?? {};
  counts[metric] = (counts[metric] ?? 0) + 1;
  skills[skill] = counts;
}

function reportsFrom(input: unknown): Record<string, unknown>[] {
  const record = asRecord(input);
  const reports = asArray(record.reports);
  return reports.length > 0 ? reports.filter(isRecord) : [record];
}

function harnessValue(value: unknown): Harness | null {
  return value === "codex" || value === "claude-code" || value === "cursor" || value === "opencode" ? value : null;
}

function actionValue(value: unknown): FileAction | null {
  return value === "read" || value === "create" || value === "edit" || value === "delete" ? value : null;
}

function categoryValue(value: unknown): ToolCategory | null {
  const categories: ToolCategory[] = ["shell", "file_read", "file_edit", "search", "web", "browser", "subagent", "planning", "mcp", "other"];
  return categories.includes(value as ToolCategory) ? value as ToolCategory : null;
}

function safeTokenUsage(value: unknown): Partial<TokenUsage> {
  const source = asRecord(value);
  const output: Partial<TokenUsage> = {};
  const keys: (keyof TokenUsage)[] = ["input", "cachedInput", "cacheWriteInput", "output", "reasoningOutput", "total"];
  for (const key of keys) {
    const raw = source[key];
    if (raw === null || typeof raw === "number") output[key] = raw;
  }
  return output;
}

const tokenKeys: (keyof TokenUsage)[] = ["input", "cachedInput", "cacheWriteInput", "output", "reasoningOutput", "total"];

function rangeTokenUsage(session: Record<string, unknown>, fromMessage: number, toMessage: number | null): { scope: "message-range" | "whole-session"; values: Partial<TokenUsage> } {
  const points = asArray(session.tokenUsageByMessage).filter(isRecord).map((point) => ({
    messageIndex: asNumber(point.messageIndex),
    cumulative: point.cumulative === true,
    values: safeTokenUsage(point.values),
  })).filter((point): point is { messageIndex: number; cumulative: boolean; values: Partial<TokenUsage> } => point.messageIndex !== null);
  if (points.length === 0) return { scope: "whole-session", values: safeTokenUsage(session.tokens) };
  const selected = points.filter((point) => point.messageIndex >= fromMessage && (toMessage === null || point.messageIndex <= toMessage));
  if (selected.length === 0) return { scope: "whole-session", values: safeTokenUsage(session.tokens) };
  if (points.every((point) => point.cumulative)) {
    const end = selected.at(-1)?.values ?? {};
    const baseline = points.filter((point) => point.messageIndex < fromMessage).at(-1)?.values ?? {};
    const values: Partial<TokenUsage> = {};
    for (const key of tokenKeys) {
      const endValue = end[key];
      const baselineValue = baseline[key];
      values[key] = endValue === null || endValue === undefined ? null : endValue < (baselineValue ?? 0) ? null : endValue - (baselineValue ?? 0);
    }
    return { scope: "message-range", values };
  }
  const values: Partial<TokenUsage> = {};
  for (const key of tokenKeys) {
    const selectedValues = selected.map((point) => point.values[key]);
    values[key] = selectedValues.some((value) => value === null) ? null : selectedValues.reduce<number>((total, value) => total + (value ?? 0), 0);
  }
  return { scope: "message-range", values };
}

export function buildTaskTrace(request: BuildTaskTraceRequest): TaskTrace {
  const sessions = new Map<string, { harness: Harness; session: Record<string, unknown> }>();
  for (const report of reportsFrom(request.report)) {
    const harness = harnessValue(report.harness);
    if (!harness) continue;
    for (const session of asArray(report.sessions).filter(isRecord)) {
      const sessionId = asString(session.sessionId);
      if (sessionId) sessions.set(`${harness}:${sessionId}`, { harness, session });
    }
  }

  const selectedCalls: TokenCall[] = [];
  const cursorUsage: NonNullable<TaskTrace["cursorUsage"]> = [];
  let sessionSettings = emptySessionSettings();
  let contextUsage: ContextUsage = { peakInputTokens: null, lastInputTokens: null };
  let missingSlices = 0;
  const seenSlices: SliceSelection[] = [];
  const tools: Record<string, number> = {};
  const toolCategories: Partial<Record<ToolCategory, number>> = {};
  const skills: TaskTrace["skills"] = {};
  const mcpServers: Record<string, number> = {};
  const files = new Map<string, TaskTrace["files"][number]>();
  const webPages = new Set<string>();
  const models = new Set<string>();
  const tokens: TaskTrace["tokens"] = [];
  const costs: TaskTrace["costs"] = [];
  const sessionSlices: TaskTrace["sessionSlices"] = [];

  for (const selection of request.slices) {
    if (selection.fromMessage < 0 || (selection.toMessage !== null && selection.toMessage < selection.fromMessage)) throw new Error("Intervalo inválido");
    if (seenSlices.some((s) => s.harness === selection.harness && s.sessionId === selection.sessionId && s.fromMessage <= (selection.toMessage ?? Infinity) && selection.fromMessage <= (s.toMessage ?? Infinity))) throw new Error("Los intervalos de una sesión no pueden solaparse");
    seenSlices.push(selection);
    const found = sessions.get(`${selection.harness}:${selection.sessionId}`);
    if (!found) throw new Error(`No existe ${selection.harness}/${selection.sessionId} en el informe`);
    const { session } = found;
    if (selection.harness === "cursor" && !cursorUsage.some(row => row.sessionId === selection.sessionId)) {
      const usage = asRecord(session.cursorUsage);
      const turns = asArray(usage.turns).filter(isRecord).flatMap(turn => {
        const generationId = asString(turn.generationId);
        const recordedAt = asString(turn.recordedAt);
        if (!generationId || !recordedAt) return [];
        const settings = extractHookSettings(turn.settings ?? {});
        return [{
          generationId,
          recordedAt,
          model: asString(turn.model),
          values: safeCursorValues(turn.values),
          ...(hasSessionSettings(settings) ? { settings } : {}),
        }];
      });
      cursorUsage.push({ sessionId: selection.sessionId, scope: "whole-session", agentScope: "parent-only", transcriptTurns: asNumber(usage.transcriptTurns) ?? 0, turns });
      sessionSettings = mergeSessionSettings(extractHookSettings(session.sessionSettings ?? {}), sessionSettings);
      const observed = summarizeContextUsage(turns);
      if (contextUsage.peakInputTokens === null) contextUsage = observed;
    }
    const calls = asArray(session.tokenCalls).filter(isRecord).filter((call) => {
      const index = asNumber(call.messageIndex);
      return index !== null && index >= selection.fromMessage && (selection.toMessage === null || index <= selection.toMessage);
    });
    if (calls.length === 0) missingSlices += 1;
    for (const call of calls) {
      const usage = safeTokenUsage(call.values);
      selectedCalls.push({ sessionId: selection.sessionId, messageIndex: asNumber(call.messageIndex) ?? 0, model: asString(call.model), timestamp: asString(call.timestamp), values: { input: usage.input ?? null, cachedInput: usage.cachedInput ?? null, cacheWriteInput: usage.cacheWriteInput ?? null, output: usage.output ?? null, reasoningOutput: usage.reasoningOutput ?? null, total: usage.total ?? null } });
    }
    const events = asArray(session.events).filter(isRecord).filter((event) => {
      const index = asNumber(event.messageIndex);
      return index !== null && index >= selection.fromMessage && (selection.toMessage === null || index <= selection.toMessage);
    });
    sessionSlices.push({
      harness: selection.harness,
      sessionId: selection.sessionId,
      sourcePath: asString(session.sourcePath),
      projectPath: asString(session.projectPath),
      fromMessage: selection.fromMessage,
      toMessage: selection.toMessage,
      startedAt: asString(events[0]?.timestamp),
      endedAt: asString(events.at(-1)?.timestamp),
      eventCount: events.length,
    });
    for (const model of asArray(session.models)) if (typeof model === "string") models.add(model);
    const scopedTokens = rangeTokenUsage(session, selection.fromMessage, selection.toMessage);
    tokens.push({ harness: selection.harness, sessionId: selection.sessionId, ...scopedTokens });
    const cost = asNumber(session.cost);
    if (cost !== null) costs.push({ harness: selection.harness, sessionId: selection.sessionId, scope: "whole-session", amount: cost, currency: "USD" });

    for (const event of events) {
      const tool = asString(event.tool);
      if (tool) increment(tools, tool);
      const category = categoryValue(event.category);
      if (category) toolCategories[category] = (toolCategories[category] ?? 0) + 1;
      const mcpServer = asString(event.mcpServer);
      if (mcpServer) increment(mcpServers, mcpServer);
      for (const skill of asArray(event.skills)) {
        if (typeof skill !== "string") continue;
        incrementSkill(skills, skill, "loaded");
        incrementSkill(skills, skill, "statusObserved");
      }
      for (const rawAsset of asArray(event.skillAssets)) {
        const asset = asRecord(rawAsset);
        const skill = asString(asset.skill);
        if (!skill) continue;
        if (asset.type === "references") incrementSkill(skills, skill, "referencesRead");
        else if (asset.type === "scripts" && category === "shell") incrementSkill(skills, skill, "scriptsRun");
      }
      for (const rawFile of asArray(event.files)) {
        const file = asRecord(rawFile);
        const path = asString(file.path);
        const action = actionValue(file.action);
        const kind = asString(file.kind);
        if (path && action && kind) files.set(`${action}:${path}`, { path, action, kind });
      }
      for (const url of asArray(event.urls)) if (typeof url === "string") webPages.add(url);
    }
  }

  for (const skill of request.manualSkills ?? []) incrementSkill(skills, skill, "manuallyInvoked");
  for (const skill of request.automaticSkills ?? []) incrementSkill(skills, skill, "automaticallySelected");
  for (const skill of request.completedSkills ?? []) incrementSkill(skills, skill, "completed");

  return {
    schemaVersion: SCHEMA_VERSION,
    ...(cursorUsage.length ? { cursorUsage } : {}),
    ...(hasSessionSettings(sessionSettings) ? { sessionSettings } : {}),
    ...(contextUsage.peakInputTokens !== null || contextUsage.lastInputTokens !== null ? { contextUsage } : {}),
    apiCost: estimateApiCost(selectedCalls, missingSlices),
    generatedAt: (request.now ?? new Date()).toISOString(),
    privacy: { promptsIncluded: false, fileContentsIncluded: false, webContentsIncluded: false, searchQueriesIncluded: false, urlsPreservedVerbatim: true },
    sessionSlices,
    models: [...models].sort(),
    tokens,
    costs,
    tools: Object.fromEntries(Object.entries(tools).sort(([, a], [, b]) => b - a)),
    toolCategories,
    skills: Object.fromEntries(Object.entries(skills).sort(([a], [b]) => a.localeCompare(b))),
    mcpServers: Object.fromEntries(Object.entries(mcpServers).sort(([, a], [, b]) => b - a)),
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path) || a.action.localeCompare(b.action)),
    webPages: [...webPages].sort(),
    coverage: { tokens: "message-range-when-available", skillLifecycle: "observed-or-unknown", messageRanges: "observed" },
  };
}
