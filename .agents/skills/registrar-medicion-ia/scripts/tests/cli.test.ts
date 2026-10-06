import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("trace-analyzer CLI", () => {
  test("prints a normalized report through the public command", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-cli-"));
    temporaryDirectories.push(root);
    const home = join(root, ".codex");
    const project = join(root, "project");
    await mkdir(join(home, "sessions"), { recursive: true });
    await writeFile(join(home, "sessions", "session.jsonl"), `${JSON.stringify({ type: "session_meta", payload: { id: "cli-session", cwd: project } })}\n`);

    const process = Bun.spawn(["bun", "trace-analyzer.ts", "analyze", "--harness", "codex", "--home", home, "--project", project, "--limit", "1"], {
      cwd: join(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([process.exited, new Response(process.stdout).text(), new Response(process.stderr).text()]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    const report = JSON.parse(stdout) as { harness: string; sessions: Array<{ sessionId: string }> };
    expect(report.harness).toBe("codex");
    expect(report.sessions[0]?.sessionId).toBe("cli-session");
  });

  test("runs local message inspection through the public command", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-cli-messages-"));
    temporaryDirectories.push(root);
    const home = join(root, ".codex");
    const project = join(root, "project");
    await mkdir(join(home, "sessions"), { recursive: true });
    await writeFile(join(home, "sessions", "session.jsonl"), [
      { type: "session_meta", payload: { id: "cli-message", cwd: project } },
      { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "local request" }] } },
    ].map((event) => JSON.stringify(event)).join("\n"));

    const process = Bun.spawn(["bun", "trace-analyzer.ts", "inspect-user-messages", "--harness", "codex", "--home", home, "--project", project], {
      cwd: join(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe",
    });
    const [exitCode, stdout] = await Promise.all([process.exited, new Response(process.stdout).text()]);
    const result = JSON.parse(stdout) as { localOnly: boolean; sessions: Array<{ messages: Array<{ text: string }> }> };

    expect(exitCode).toBe(0);
    expect(result.localOnly).toBeTrue();
    expect(result.sessions[0]?.messages[0]?.text).toBe("local request");
  });

  test("builds an upload-safe task trace through the public command", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-traces-cli-build-"));
    temporaryDirectories.push(root);
    const reportPath = join(root, "report.json");
    await writeFile(reportPath, JSON.stringify({
      harness: "codex",
      sessions: [{ sessionId: "session", sourcePath: "/trace", projectPath: "/project", models: [], tokens: {}, tokenUsageByMessage: [], prompt: "private", events: [{ messageIndex: 0, tool: "Read", category: "file_read", files: [], urls: [], skills: [], skillAssets: [] }] }],
    }));
    const process = Bun.spawn(["bun", "trace-analyzer.ts", "build-task-trace", reportPath, "--slice", "codex,session,0,0"], {
      cwd: join(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe",
    });
    const [exitCode, stdout] = await Promise.all([process.exited, new Response(process.stdout).text()]);

    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("private");
    expect((JSON.parse(stdout) as { sessionSlices: Array<{ eventCount: number }> }).sessionSlices[0]?.eventCount).toBe(1);
  });
});
