import { extname, isAbsolute, relative, resolve } from "node:path";
import type {
  AnalysisReport,
  FileEvent,
  Harness,
  NormalizedSession,
  SkillUsage,
  ToolCategory,
  ToolEvent,
  TokenUsage,
} from "./model.ts";
import { SCHEMA_VERSION } from "./model.ts";
import { isRecord, nestedStrings } from "../shared/unknown.ts";

const documentationExtensions = new Set([".md", ".mdx", ".txt", ".rst", ".adoc"]);
const testCommand = /\b(?:pnpm|npm|yarn|bun)\s+(?:run\s+)?(?:test|lint|typecheck|check)\b|\b(?:vitest|jest|pytest|cargo\s+test|go\s+test|tsc)\b/i;
const gitCommand = /\bgit\s+(?:status|diff|log|show|branch|rev-parse|add|commit|push|pull|fetch|merge|rebase)\b/i;

export function emptyTokens(): TokenUsage {
  return { input: null, cachedInput: null, cacheWriteInput: null, output: null, reasoningOutput: null, total: null };
}

export function emptySession(harness: Harness, sessionId: string, sourcePath: string): NormalizedSession {
  return {
    harness,
    sessionId,
    startedAt: null,
    updatedAt: null,
    projectPath: null,
    sourcePath,
    models: [],
    turns: null,
    messages: { user: 0, assistant: 0 },
    skills: {},
    tools: {},
    toolCategories: {},
    tokens: emptyTokens(),
    tokenUsageByMessage: [],
    activity: {
      testOrCheckCalls: 0,
      gitCalls: 0,
      webSearches: 0,
      filesRead: [],
      filesChanged: [],
      filesCreated: [],
      filesEdited: [],
      filesDeleted: [],
      webPages: [],
      mcpServers: [],
    },
    events: [],
    coverage: { messages: false, skills: false, toolCalls: false, toolResults: false, tokens: false, files: false },
    diagnostics: [],
  };
}

export function fileKind(path: string): string {
  const extension = extname(path).toLowerCase();
  if (documentationExtensions.has(extension)) return "documentation";
  return extension ? extension.slice(1) : "unknown";
}

export function normalizePath(path: string, cwd: string | null): string {
  if (path.startsWith("file://")) path = path.slice("file://".length);
  if (path.startsWith("~/")) path = `${process.env.HOME ?? ""}/${path.slice(2)}`;
  return isAbsolute(path) || !cwd ? path : resolve(cwd, path);
}

export function isoFromEpoch(value: number | null): string | null {
  if (value === null) return null;
  const milliseconds = value > 10_000_000_000 ? value : value * 1_000;
  return new Date(milliseconds).toISOString();
}

export function projectMatches(sessionPath: string | null, project: string | null): boolean {
  if (!project) return true;
  if (!sessionPath) return false;
  const expected = resolve(project);
  const actual = resolve(sessionPath);
  const pathFromExpected = relative(expected, actual);
  return pathFromExpected === "" || (!pathFromExpected.startsWith("..") && !isAbsolute(pathFromExpected));
}

export function skillNamesFromPath(path: string): string[] {
  const normalized = path.replaceAll("\\", "/");
  const match = /(?:^|\/)skills\/([^\s"'`/]+)\/SKILL\.md$/i.exec(normalized);
  if (!match?.[1]) return [];
  const captured = match[1];
  if (captured.startsWith("{") && captured.endsWith("}")) {
    return captured.slice(1, -1).split(",").filter(Boolean);
  }
  return [captured];
}

export function skillAssetFromPath(path: string): { skill: string; type: "references" | "scripts" } | null {
  const match = /(?:^|[/\\])skills[/\\]([^\s"'`/\\]+)[/\\](references|scripts)[/\\]/i.exec(path);
  if (!match?.[1] || (match[2] !== "references" && match[2] !== "scripts")) return null;
  return { skill: match[1], type: match[2] };
}

export function addSkill(session: NormalizedSession, name: string, field: keyof SkillUsage, amount = 1): void {
  const usage = session.skills[name] ?? { reads: 0, edits: 0, attributedMessages: 0 };
  usage[field] += amount;
  session.skills[name] = usage;
}

function mcpIdentity(name: string, category: ToolCategory): [string | null, string | null] {
  if (!name.startsWith("mcp__") && category !== "mcp") return [null, null];
  const unprefixed = name.startsWith("mcp__") ? name.slice(5) : name;
  if (unprefixed.includes("__")) {
    const [server, ...tool] = unprefixed.split("__");
    return [server || null, tool.join("__") || null];
  }
  if (unprefixed.includes(".") && !unprefixed.startsWith("tools.") && !unprefixed.startsWith("functions.")) {
    const [server, ...tool] = unprefixed.split(".");
    return [server || null, tool.join(".") || null];
  }
  return [null, null];
}

export function addToolEvent(
  session: NormalizedSession,
  input: {
    name: string;
    category: ToolCategory;
    callId?: string | null;
    messageIndex?: number | null;
    timestamp?: string | null;
    files?: FileEvent[];
    urls?: string[];
  },
): ToolEvent {
  const usage = session.tools[input.name] ?? { calls: 0, results: 0, errors: 0 };
  usage.calls += 1;
  session.tools[input.name] = usage;
  session.toolCategories[input.category] = (session.toolCategories[input.category] ?? 0) + 1;
  const [mcpServer, mcpTool] = mcpIdentity(input.name, input.category);
  const files = input.files ?? [];
  const skills = [...new Set(files.flatMap((file) => skillNamesFromPath(file.path)))].sort();
  const skillAssets = [...new Map(files.map((file) => skillAssetFromPath(file.path)).filter((asset) => asset !== null).map((asset) => [`${asset.skill}:${asset.type}`, asset])).values()];
  const event: ToolEvent = {
    type: "tool_call",
    callId: input.callId ?? null,
    messageIndex: input.messageIndex ?? null,
    timestamp: input.timestamp ?? null,
    tool: input.name,
    category: input.category,
    mcpServer,
    mcpTool,
    files,
    urls: [...new Set(input.urls ?? [])].sort(),
    skills,
    skillAssets,
    result: "unknown",
  };
  session.events.push(event);
  session.activity.filesRead.push(...files.filter((file) => file.action === "read").map((file) => file.path));
  session.activity.filesChanged.push(...files.filter((file) => file.action !== "read").map((file) => file.path));
  session.activity.filesCreated.push(...files.filter((file) => file.action === "create").map((file) => file.path));
  session.activity.filesEdited.push(...files.filter((file) => file.action === "edit").map((file) => file.path));
  session.activity.filesDeleted.push(...files.filter((file) => file.action === "delete").map((file) => file.path));
  session.activity.webPages.push(...event.urls);
  if (mcpServer) session.activity.mcpServers.push(mcpServer);
  for (const skill of skills) addSkill(session, skill, input.category === "file_edit" ? "edits" : "reads");
  return event;
}

export function commandCounts(value: unknown): { tests: number; git: number } {
  const strings = [...nestedStrings(value)];
  return {
    tests: strings.some((text) => testCommand.test(text)) ? 1 : 0,
    git: strings.some((text) => gitCommand.test(text)) ? 1 : 0,
  };
}

export function isWebSearchTool(name: string): boolean {
  return name.toLowerCase().includes("search");
}

export function completeToolEvent(session: NormalizedSession, callId: string | null, isError: boolean): void {
  if (!callId) return;
  const event = session.events.findLast((candidate) => candidate.callId === callId);
  if (!event) return;
  event.result = isError ? "error" : "success";
  const usage = session.tools[event.tool];
  if (!usage) return;
  usage.results += 1;
  if (isError) usage.errors += 1;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function finalizeSession(session: NormalizedSession): NormalizedSession {
  session.models = sortedUnique(session.models);
  session.skills = Object.fromEntries(Object.entries(session.skills).sort(([a], [b]) => a.localeCompare(b)));
  session.tools = Object.fromEntries(Object.entries(session.tools).sort(([a, av], [b, bv]) => bv.calls - av.calls || a.localeCompare(b)));
  session.toolCategories = Object.fromEntries(Object.entries(session.toolCategories).sort(([a, av], [b, bv]) => bv - av || a.localeCompare(b))) as Partial<Record<ToolCategory, number>>;
  session.activity.filesRead = sortedUnique(session.activity.filesRead);
  session.activity.filesChanged = sortedUnique(session.activity.filesChanged);
  session.activity.filesCreated = sortedUnique(session.activity.filesCreated);
  session.activity.filesEdited = sortedUnique(session.activity.filesEdited);
  session.activity.filesDeleted = sortedUnique(session.activity.filesDeleted);
  session.activity.webPages = sortedUnique(session.activity.webPages);
  session.activity.mcpServers = sortedUnique(session.activity.mcpServers);
  return session;
}

export function buildReport(
  harness: Harness,
  sourceRoot: string,
  project: string | null,
  limit: number,
  sessions: NormalizedSession[],
  options: { diagnostics?: string[]; matchedSessions?: number } = {},
): AnalysisReport {
  const selected = sessions
    .toSorted((a, b) => (b.updatedAt ?? b.startedAt ?? "").localeCompare(a.updatedAt ?? a.startedAt ?? ""))
    .slice(0, limit)
    .map(finalizeSession);
  const toolCalls: Record<string, number> = {};
  const toolCategories: Partial<Record<ToolCategory, number>> = {};
  const skills: Record<string, SkillUsage> = {};
  const tokens: Partial<TokenUsage> = {};
  for (const session of selected) {
    for (const [name, usage] of Object.entries(session.tools)) toolCalls[name] = (toolCalls[name] ?? 0) + usage.calls;
    for (const [name, count] of Object.entries(session.toolCategories) as [ToolCategory, number][]) toolCategories[name] = (toolCategories[name] ?? 0) + count;
    for (const [name, usage] of Object.entries(session.skills)) {
      const total = skills[name] ?? { reads: 0, edits: 0, attributedMessages: 0 };
      total.reads += usage.reads;
      total.edits += usage.edits;
      total.attributedMessages += usage.attributedMessages;
      skills[name] = total;
    }
    for (const [name, value] of Object.entries(session.tokens) as [keyof TokenUsage, number | null][]) {
      tokens[name] = value === null || tokens[name] === null ? null : (tokens[name] ?? 0) + value;
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    harness,
    sourceRoot,
    filters: { project: project ? resolve(project) : null, limit },
    matchedSessions: options.matchedSessions ?? sessions.length,
    sessions: selected,
    aggregate: { toolCalls, toolCategories, skills, tokens },
    diagnostics: options.diagnostics ?? [],
  };
}

export function pathFields(value: unknown): string[] {
  const paths: string[] = [];
  if (typeof value === "string") {
    for (const match of value.matchAll(/\b(?:path|file_path|filePath|target_file|targetFile)\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g)) {
      const literal = match[1];
      if (!literal) continue;
      if (literal.startsWith('"')) {
        try {
          const parsed: unknown = JSON.parse(literal);
          if (typeof parsed === "string") paths.push(parsed);
        } catch {
          // Ignore malformed wrapper text instead of guessing a path.
        }
      } else {
        paths.push(literal.slice(1, -1).replaceAll("\\'", "'"));
      }
    }
    return paths;
  }
  if (Array.isArray(value)) {
    for (const nested of value) paths.push(...pathFields(nested));
    return paths;
  }
  if (!isRecord(value)) return paths;
  for (const [key, nested] of Object.entries(value)) {
    if (["path", "file_path", "filePath", "target_file", "targetFile", "uri"].includes(key) && typeof nested === "string") {
      if (key !== "uri" || /^(?:file:\/\/|\/|~)/.test(nested)) paths.push(nested);
    } else {
      paths.push(...pathFields(nested));
    }
  }
  return paths;
}

export function visitedUrls(value: unknown): string[] {
  const urls = new Set<string>();
  const visit = (nested: unknown): void => {
    if (Array.isArray(nested)) {
      nested.forEach(visit);
      return;
    }
    if (isRecord(nested)) {
      for (const [key, child] of Object.entries(nested)) {
        if (["url", "href", "ref_id"].includes(key.toLowerCase()) && typeof child === "string" && /^https?:\/\/\S+$/i.test(child)) urls.add(child);
        else visit(child);
      }
      return;
    }
    if (typeof nested === "string") {
      for (const match of nested.matchAll(/["'](?:url|href|ref_id)["']\s*:\s*["'](?<url>https?:\/\/[^"']+)["']/gi)) {
        if (match.groups?.url) urls.add(match.groups.url);
      }
    }
  };
  visit(value);
  return [...urls].sort();
}

export function fileEventsFromPaths(paths: string[], action: FileEvent["action"], cwd: string | null): FileEvent[] {
  return [...new Set(paths.map((path) => normalizePath(path, cwd)))].map((path) => ({ path, action, kind: fileKind(path) }));
}

export function patchFileEvents(value: unknown, cwd: string | null): FileEvent[] {
  const actionByVerb = { Add: "create", Update: "edit", Delete: "delete" } as const;
  const events = new Map<string, FileEvent>();
  for (const rawText of nestedStrings(value)) {
    const wrappedPatches = [...rawText.matchAll(/\btools\.apply_patch\(\s*("(?:\\.|[^"\\])*")/g)]
      .flatMap((match) => {
        try {
          const parsed: unknown = JSON.parse(match[1] ?? "");
          return typeof parsed === "string" ? [parsed] : [];
        } catch {
          return [];
        }
      });
    const patchTexts = wrappedPatches.length > 0 ? wrappedPatches : [rawText];
    for (const text of patchTexts) {
      for (const match of text.matchAll(/^\*\*\* (Add|Update|Delete) File: ([^\r\n]+)$/gm)) {
      const verb = match[1] as keyof typeof actionByVerb;
      const rawPath = match[2]?.trim();
      if (!rawPath) continue;
      const path = normalizePath(rawPath, cwd);
      const event = { path, action: actionByVerb[verb], kind: fileKind(path) } satisfies FileEvent;
      events.set(`${event.action}:${event.path}`, event);
      }
    }
  }
  return [...events.values()];
}
