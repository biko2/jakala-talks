#!/usr/bin/env bun
import { runCli } from "./src/adapters/cli.ts";

try {
  const result = await runCli(Bun.argv.slice(2));
  const pretty = Bun.argv.includes("--pretty");
  console.log(JSON.stringify(result, null, pretty ? 2 : undefined));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
