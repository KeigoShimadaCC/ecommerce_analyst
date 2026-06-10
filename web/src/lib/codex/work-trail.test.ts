import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ThreadItem } from "@openai/codex-sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureWorkTrail } from "./work-trail";

describe("captureWorkTrail", () => {
  let snapshotDirectory: string;

  beforeEach(async () => {
    snapshotDirectory = await mkdtemp(join(tmpdir(), "work-trail-test-"));
  });

  afterEach(async () => {
    await rm(snapshotDirectory, { force: true, recursive: true });
  });

  it("maps SDK command execution items to analysis command log entries", async () => {
    const trail = await captureWorkTrail({
      snapshotDirectory,
      turns: [
        {
          items: [
            {
              aggregated_output: "Wrote result.json\n",
              command: "node analysis.mjs",
              exit_code: 0,
              id: "cmd-1",
              status: "completed",
              type: "command_execution"
            }
          ]
        }
      ]
    });

    expect(trail.commandLog).toEqual([
      {
        command: "node analysis.mjs",
        exitCode: 0,
        output: "Wrote result.json\n",
        status: "completed"
      }
    ]);
  });

  it("reads generated code from changed analysis files", async () => {
    await writeFile(
      join(snapshotDirectory, "analysis.py"),
      "print('analysis')\n"
    );

    const trail = await captureWorkTrail({
      snapshotDirectory,
      turns: [
        {
          items: [
            {
              changes: [{ kind: "add", path: "analysis.py" }],
              id: "file-1",
              status: "completed",
              type: "file_change"
            }
          ]
        }
      ]
    });

    expect(trail.generatedCode).toContain("# File: analysis.py");
    expect(trail.generatedCode).toContain("print('analysis')");
  });

  it("scans the snapshot directory so generated code is not blank when the script exists", async () => {
    await writeFile(
      join(snapshotDirectory, "analysis.mjs"),
      "console.log('fallback scan');\n"
    );

    const trail = await captureWorkTrail({
      snapshotDirectory,
      turns: [{ items: [] }]
    });

    expect(trail.generatedCode).toContain("# File: analysis.mjs");
    expect(trail.generatedCode).toContain("console.log('fallback scan');");
  });

  it("ignores non-analysis file changes", async () => {
    await writeFile(join(snapshotDirectory, "result.json"), "{}\n");

    const trail = await captureWorkTrail({
      snapshotDirectory,
      turns: [
        {
          items: [
            {
              changes: [{ kind: "add", path: "result.json" }],
              id: "file-1",
              status: "completed",
              type: "file_change"
            } satisfies ThreadItem
          ]
        }
      ]
    });

    expect(trail.generatedCode).toBe("");
  });
});
