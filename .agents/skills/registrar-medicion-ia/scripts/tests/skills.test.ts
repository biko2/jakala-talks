import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const skillRoot = resolve(import.meta.dir, "../..");

async function filesBelow(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") files.push(...await filesBelow(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

describe("measurement skills", () => {
  test("have valid minimal frontmatter and use the Bun entrypoint", async () => {
    {
      const content = await Bun.file(join(skillRoot, "SKILL.md")).text();
      const frontmatter = /^---\n([\s\S]+?)\n---/.exec(content)?.[1] ?? "";
      expect(frontmatter).toContain("name: registrar-medicion-ia");
      expect(frontmatter).toMatch(/^description: .+/m);
      expect(content).not.toMatch(/python3|\.py\b/);
    }
    const analyzer = await Bun.file(join(skillRoot, "SKILL.md")).text();
    expect(analyzer).toContain("bun scripts/trace-analyzer.ts");
  });

  test("ships no Python implementation", async () => {
    const files = await filesBelow(join(skillRoot, "scripts"));
    expect(files.filter((path) => path.endsWith(".py") || path.includes("__pycache__"))).toEqual([]);
  });
});
