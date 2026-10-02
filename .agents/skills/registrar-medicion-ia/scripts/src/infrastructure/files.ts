import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join } from "node:path";

export async function* jsonLines(path: string): AsyncGenerator<unknown | null> {
  const input = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    try {
      yield JSON.parse(line) as unknown;
    } catch {
      yield null;
    }
  }
}

export async function findFiles(root: string, suffix: string): Promise<string[]> {
  const found: string[] = [];
  async function visit(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && path.endsWith(suffix)) found.push(path);
    }
  }
  await visit(root);
  return found;
}

export async function modifiedAt(path: string): Promise<number> {
  return (await stat(path)).mtimeMs;
}
