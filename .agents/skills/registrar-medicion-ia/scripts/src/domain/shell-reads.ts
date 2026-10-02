import type { FileEvent } from "./model.ts";
import { fileEventsFromPaths } from "./normalization.ts";

function quotedFields(text: string, field: string): string[] {
  const values: string[] = [];
  const expression = new RegExp(`\\b${field}\\s*:\\s*("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')`, "g");
  for (const match of text.matchAll(expression)) {
    const literal = match[1];
    if (!literal) continue;
    if (literal.startsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(literal);
        if (typeof parsed === "string") values.push(parsed);
      } catch {
        // Invalid wrapper text is ignored rather than guessed.
      }
    } else {
      values.push(literal.slice(1, -1).replaceAll("\\'", "'"));
    }
  }
  return values;
}

function shellCommands(value: unknown): string[] {
  if (typeof value === "string") {
    const embedded = [...quotedFields(value, "cmd"), ...quotedFields(value, "command")];
    return embedded.length > 0 ? embedded : [value];
  }
  if (Array.isArray(value)) return value.flatMap(shellCommands);
  if (typeof value !== "object" || value === null) return [];
  const record = value as Record<string, unknown>;
  const direct = [record.cmd, record.command].filter((item): item is string => typeof item === "string");
  return direct.length > 0 ? direct : Object.values(record).flatMap(shellCommands);
}

function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;
  const flush = (): void => {
    if (current) tokens.push(current);
    current = "";
  };
  for (const char of command) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\" && quote !== "'") {
      escaped = true;
    } else if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (/\s/.test(char) || ";|&".includes(char)) {
      flush();
      if (";|&\n".includes(char)) tokens.push("\0");
    } else {
      current += char;
    }
  }
  flush();
  return tokens;
}

function commandSegments(command: string): string[][] {
  const segments: string[][] = [[]];
  for (const token of tokenize(command)) {
    if (token === "\0") {
      if (segments.at(-1)?.length) segments.push([]);
    } else {
      segments.at(-1)?.push(token);
    }
  }
  return segments.filter((segment) => segment.length > 0);
}

function catFiles(args: string[]): string[] {
  return args.filter((arg) => !arg.startsWith("-") && arg !== "/dev/null");
}

function headOrTailFiles(args: string[]): string[] {
  const files: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (["-n", "--lines", "-c", "--bytes"].includes(arg)) {
      index += 1;
      continue;
    }
    if (/^-\d+$/.test(arg) || arg.startsWith("-")) continue;
    files.push(arg);
  }
  return files;
}

function sedFiles(args: string[]): string[] {
  let scriptSeen = false;
  const files: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (["-e", "--expression", "-f", "--file"].includes(arg)) {
      index += 1;
      scriptSeen = true;
      continue;
    }
    if (arg.startsWith("-")) continue;
    if (!scriptSeen) {
      scriptSeen = true;
      continue;
    }
    files.push(arg);
  }
  return files;
}

export function shellReadEvents(value: unknown, cwd: string | null): FileEvent[] {
  const paths: string[] = [];
  for (const command of shellCommands(value)) {
    for (const segment of commandSegments(command)) {
      const [executablePath, ...args] = segment;
      const executable = executablePath?.split("/").at(-1);
      if (executable === "cat") paths.push(...catFiles(args));
      else if (executable === "head" || executable === "tail") paths.push(...headOrTailFiles(args));
      else if (executable === "sed") paths.push(...sedFiles(args));
    }
  }
  return fileEventsFromPaths(paths.filter((path) => !/[\n\r*$(){}]/.test(path)), "read", cwd);
}
