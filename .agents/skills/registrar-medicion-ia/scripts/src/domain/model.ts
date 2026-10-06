export const SCHEMA_VERSION = "1.0" as const;

export type Harness = "codex" | "claude-code" | "cursor" | "opencode";

export type ToolCategory =
  | "shell"
  | "file_read"
  | "file_edit"
  | "search"
  | "web"
  | "browser"
  | "subagent"
  | "planning"
  | "mcp"
  | "other";

export type FileAction = "read" | "create" | "edit" | "delete";
export type ToolResult = "unknown" | "success" | "error";

export interface TokenUsage {
  input: number | null;
  cachedInput: number | null;
  cacheWriteInput: number | null;
  output: number | null;
  reasoningOutput: number | null;
  total: number | null;
}

export interface MessageTokenUsage {
  messageIndex: number;
  values: TokenUsage;
  cumulative: boolean;
}

export interface SkillUsage {
  reads: number;
  edits: number;
  attributedMessages: number;
}

export interface ToolUsage {
  calls: number;
  results: number;
  errors: number;
}

export interface FileEvent {
  path: string;
  action: FileAction;
  kind: string;
}

export interface SkillAsset {
  skill: string;
  type: "references" | "scripts";
}

export interface ToolEvent {
  type: "tool_call";
  callId: string | null;
  messageIndex: number | null;
  timestamp: string | null;
  tool: string;
  category: ToolCategory;
  mcpServer: string | null;
  mcpTool: string | null;
  files: FileEvent[];
  urls: string[];
  skills: string[];
  skillAssets: SkillAsset[];
  result: ToolResult;
}

export interface SessionActivity {
  testOrCheckCalls: number;
  gitCalls: number;
  webSearches: number;
  filesRead: string[];
  filesChanged: string[];
  filesCreated: string[];
  filesEdited: string[];
  filesDeleted: string[];
  webPages: string[];
  mcpServers: string[];
  linesAdded?: number | null;
  linesRemoved?: number | null;
  filesChangedCount?: number | null;
}

export interface Coverage {
  messages: boolean;
  skills: boolean;
  toolCalls: boolean;
  toolResults: boolean;
  tokens: boolean;
  files: boolean;
}

export interface NormalizedSession {
  cursorUsage?: import("../domain/cursor-usage.ts").CursorUsage;
  tokenCalls?: import("./api-cost.ts").TokenCall[];
  harness: Harness;
  sessionId: string;
  startedAt: string | null;
  updatedAt: string | null;
  projectPath: string | null;
  sourcePath: string;
  models: string[];
  turns: number | null;
  messages: Record<"user" | "assistant", number>;
  skills: Record<string, SkillUsage>;
  tools: Record<string, ToolUsage>;
  toolCategories: Partial<Record<ToolCategory, number>>;
  tokens: TokenUsage;
  tokenUsageByMessage: MessageTokenUsage[];
  cost?: number;
  activity: SessionActivity;
  events: ToolEvent[];
  coverage: Coverage;
  diagnostics: string[];
}

export interface AnalysisReport {
  schemaVersion: typeof SCHEMA_VERSION;
  generatedAt: string;
  harness: Harness;
  sourceRoot: string;
  filters: { project: string | null; limit: number };
  matchedSessions: number;
  sessions: NormalizedSession[];
  aggregate: {
    toolCalls: Record<string, number>;
    toolCategories: Partial<Record<ToolCategory, number>>;
    skills: Record<string, SkillUsage>;
    tokens: Partial<TokenUsage>;
  };
  diagnostics: string[];
}

export interface AnalyzeRequest {
  home: string;
  project: string | null;
  limit: number;
}
