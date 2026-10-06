import type { Harness } from "../domain/model.ts";

export interface UserMessage {
  timestamp: string | null;
  text: string;
  messageIndex: number;
}

export interface UserMessageSession {
  harness: Harness;
  sessionId: string;
  projectPath: string | null;
  sourcePath: string;
  updatedAt?: string | null;
  messages: UserMessage[];
}

export interface UserMessageSourceRequest {
  home: string;
  project: string | null;
  limit: number;
}

export interface UserMessageSource {
  readonly harness: Harness;
  read(request: UserMessageSourceRequest): Promise<UserMessageSession[]>;
}
