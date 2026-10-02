import { homedir } from "node:os";
import { join } from "node:path";
import type { Harness } from "../domain/model.ts";
import { userMessageSources } from "../adapters/user-messages.ts";
import type { UserMessageSession } from "../ports/user-message-source.ts";

export interface InspectUserMessagesRequest {
  harness: Harness | "all";
  project: string | null;
  limit: number;
  homes?: Partial<Record<Harness, string>>;
}

export interface UserMessageReport {
  localOnly: true;
  warning: string;
  sessions: UserMessageSession[];
}

const defaults: Record<Harness, string> = {
  codex: join(homedir(), ".codex"),
  "claude-code": join(homedir(), ".claude"),
  cursor: join(homedir(), ".cursor"),
  opencode: join(homedir(), ".local", "share", "opencode"),
};

export async function inspectUserMessages(request: InspectUserMessagesRequest): Promise<UserMessageReport> {
  const harnesses = request.harness === "all" ? Object.keys(userMessageSources) as Harness[] : [request.harness];
  const nested = await Promise.all(harnesses.map((harness) => userMessageSources[harness].read({
    home: request.homes?.[harness] ?? defaults[harness],
    project: request.project,
    limit: request.limit,
  })));
  const sessions = nested.flat().toSorted((a, b) => {
    const aDate = a.updatedAt ?? a.messages.at(-1)?.timestamp ?? "";
    const bDate = b.updatedAt ?? b.messages.at(-1)?.timestamp ?? "";
    return bDate.localeCompare(aDate);
  }).slice(0, request.limit);
  return {
    localOnly: true,
    warning: "Contiene prompts del usuario. No incluir en trace_metadata ni subir al MCP.",
    sessions,
  };
}
