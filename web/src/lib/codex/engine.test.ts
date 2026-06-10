import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunResult, ThreadItem } from "@openai/codex-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAY_2026_REVENUE_BY_REGION_QUERY } from "../analytics/knownAnswer";
import {
  ANALYSIS_FALLBACK_ANSWER,
  createAnalysisEngine,
  type CodexRuntimeFactory,
  type AnalysisRunner,
  type SnapshotProvider
} from "./engine";
import type { MerchantSnapshot } from "./snapshot";

describe("analysis engine", () => {
  let tempRoot: string;
  let snapshots: TestSnapshot[];

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "engine-test-"));
    snapshots = [];
  });

  afterEach(async () => {
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("returns a validated result with non-empty generated code and command log", async () => {
    const snapshotProvider = createTestSnapshotProvider();
    const runner = createWritingRunner(async ({ snapshotDirectory }) => {
      await writeAnalysisScript(snapshotDirectory);
      await writeResult(snapshotDirectory, {
        answer: "West led May revenue.",
        chart: {
          data: [{ label: "West", value: 236640 }],
          type: "bar"
        },
        notes: ["Computed from revenue_by_region.csv."]
      });
    });
    const engine = createAnalysisEngine({
      runner,
      snapshotProvider,
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Which region led May revenue?"
    });

    expect(result.fallback).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.generatedCode).toContain("analysis.mjs");
    expect(result.generatedCode.length).toBeGreaterThan(0);
    expect(result.commandLog).toHaveLength(1);
    expect(result.commandLog[0]?.command).toBe("node analysis.mjs");
    expect(snapshots[0]?.cleanupCalls).toBe(1);
  });

  it("rejects strict-schema violations and succeeds on a corrective retry", async () => {
    const runner = createWritingRunner(async ({ attempt, snapshotDirectory }) => {
      await writeAnalysisScript(snapshotDirectory);
      if (attempt === 1) {
        await writeResult(snapshotDirectory, {
          answer: "Invalid because app fields leaked.",
          generatedCode: "leaked"
        });
        return;
      }

      await writeResult(snapshotDirectory, {
        answer: "Corrected result.",
        notes: ["Removed app-captured fields."]
      });
    });
    const engine = createAnalysisEngine({
      now: createStepClock([0, 1_000, 2_000, 3_000]),
      runner,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Retry this"
    });

    expect(result.fallback).toBe(false);
    expect(result.answer).toBe("Corrected result.");
    expect(result.attempts).toBe(2);
    expect(runner.runTurn).toHaveBeenCalledTimes(2);
    expect(runner.runTurn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("could not be accepted")
      })
    );
  });

  it("spends one timeout budget across validation retry attempts", async () => {
    let currentTimeMs = 0;
    const observedTimeouts: number[] = [];
    const runner = createWritingRunner(
      async ({ attempt, snapshotDirectory, timeoutMs }) => {
        observedTimeouts.push(timeoutMs);
        await writeAnalysisScript(snapshotDirectory);

        if (attempt === 1) {
          await writeResult(snapshotDirectory, { invalid: true });
          currentTimeMs = 25_000;
          return;
        }

        await writeResult(snapshotDirectory, {
          answer: "Corrected within remaining budget."
        });
      }
    );
    const engine = createAnalysisEngine({
      now: () => currentTimeMs,
      retryMinimumRemainingMs: 30_000,
      runner,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Retry with remaining budget"
    });

    expect(result.fallback).toBe(false);
    expect(result.attempts).toBe(2);
    expect(observedTimeouts).toEqual([60_000, 35_000]);
  });

  it("skips validation retry when the global budget is nearly exhausted", async () => {
    let currentTimeMs = 0;
    const runner = createWritingRunner(async ({ snapshotDirectory }) => {
      await writeAnalysisScript(snapshotDirectory);
      await writeResult(snapshotDirectory, { invalid: true });
      currentTimeMs = 25_001;
    });
    const engine = createAnalysisEngine({
      now: () => currentTimeMs,
      retryMinimumRemainingMs: 35_000,
      runner,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Do not retry without enough remaining budget"
    });

    expect(result.fallback).toBe(true);
    expect(result.attempts).toBe(1);
    expect(runner.runTurn).toHaveBeenCalledTimes(1);
    expect(result.notes?.[0]).toContain("result schema validation failed");
  });

  it("falls back after repeated validation failures", async () => {
    const runner = createWritingRunner(async ({ snapshotDirectory }) => {
      await writeAnalysisScript(snapshotDirectory);
      await writeResult(snapshotDirectory, {
        answer: "Still invalid.",
        unexpected: true
      });
    });
    const engine = createAnalysisEngine({
      now: createStepClock([0, 1_000, 2_000, 3_000]),
      runner,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Force fallback"
    });

    expect(result).toMatchObject({
      answer: ANALYSIS_FALLBACK_ANSWER,
      attempts: 2,
      fallback: true
    });
    expect(result.notes?.[0]).toContain("result schema validation failed");
    expect(result.generatedCode).toContain("analysis.mjs");
    expect(result.commandLog.length).toBeGreaterThan(0);
  });

  it("falls back on timeout and aborts the turn", async () => {
    const observedSignal: { current?: AbortSignal } = {};
    const runner: AnalysisRunner = {
      runTurn: vi.fn(({ signal }) => {
        observedSignal.current = signal;
        return new Promise<RunResult>(() => undefined);
      })
    };
    const engine = createAnalysisEngine({
      now: () => 0,
      runner,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 5
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Timeout"
    });

    expect(result.fallback).toBe(true);
    expect(result.answer).toBe(ANALYSIS_FALLBACK_ANSWER);
    expect(result.notes?.[0]).toContain("timed out");
    expect(observedSignal.current?.aborted).toBe(true);
    expect(snapshots[0]?.cleanupCalls).toBe(1);
  });

  it("falls back on dependency throws and still cleans up the snapshot", async () => {
    const runner: AnalysisRunner = {
      runTurn: vi.fn(async () => {
        throw new Error("runner unavailable");
      })
    };
    const engine = createAnalysisEngine({
      runner,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Throw"
    });

    expect(result).toMatchObject({
      answer: ANALYSIS_FALLBACK_ANSWER,
      attempts: 1,
      fallback: true
    });
    expect(result.notes?.[0]).toContain("runner unavailable");
    expect(snapshots[0]?.cleanupCalls).toBe(1);
  });

  it("cleans up snapshots after validation fallback", async () => {
    const engine = createAnalysisEngine({
      runner: createWritingRunner(async ({ snapshotDirectory }) => {
        await writeAnalysisScript(snapshotDirectory);
        await writeResult(snapshotDirectory, { invalid: true });
      }),
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 1_000
    });

    await engine.run({
      merchantId: "merchant-aurora",
      question: "Invalid"
    });

    expect(snapshots[0]?.cleanupCalls).toBe(1);
  });

  it("persists successful and fallback results through the injected persistence dependency", async () => {
    const persist = vi.fn();
    const successEngine = createAnalysisEngine({
      persistence: { persist },
      runner: createWritingRunner(async ({ snapshotDirectory }) => {
        await writeAnalysisScript(snapshotDirectory);
        await writeResult(snapshotDirectory, { answer: "Persist me." });
      }),
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    await successEngine.run({
      merchantId: "merchant-aurora",
      question: "Persist success"
    });

    const fallbackEngine = createAnalysisEngine({
      persistence: { persist },
      runner: createWritingRunner(async ({ snapshotDirectory }) => {
        await writeAnalysisScript(snapshotDirectory);
        await writeResult(snapshotDirectory, { invalid: true });
      }),
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 1_000
    });

    await fallbackEngine.run({
      merchantId: "merchant-aurora",
      question: "Persist fallback"
    });

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        result: expect.objectContaining({ fallback: false })
      })
    );
    expect(persist).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        result: expect.objectContaining({ fallback: true })
      })
    );
  });

  it("default runner retries an auth-like ambient failure once with explicit API auth", async () => {
    const prompts: string[] = [];
    const runtimeFactory = vi.fn<CodexRuntimeFactory>((options) =>
      createFakeCodexRuntime(async ({ prompt, signal }) => {
        prompts.push(prompt);
        expect(signal).toBeInstanceOf(AbortSignal);

        if (options?.env?.CODEX_AUTH_MODE !== "api") {
          throw new Error("401 unauthorized");
        }

        expect(options.env).toMatchObject({
          CODEX_AUTH_MODE: "api",
          OPENAI_API_KEY: "sk-test",
          OPENAI_MODEL: "gpt-5.5",
          OPENAI_REASONING_EFFORT: "low"
        });
        expect(options.workingDirectory).toBeTruthy();
        await writeAnalysisScript(options.workingDirectory ?? "");
        await writeResult(options.workingDirectory ?? "", {
          answer: "API failover succeeded."
        });

        return buildTurn([
          {
            changes: [{ kind: "add", path: "analysis.mjs" }],
            id: "api-file",
            status: "completed",
            type: "file_change"
          },
          {
            aggregated_output: "Wrote result.json\n",
            command: "node analysis.mjs",
            exit_code: 0,
            id: "api-command",
            status: "completed",
            type: "command_execution"
          }
        ]);
      })
    );
    const engine = createAnalysisEngine({
      codexEnv: {
        OPENAI_API_KEY: "sk-test"
      },
      codexRuntimeFactory: runtimeFactory,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: "Use failover"
    });

    expect(result.fallback).toBe(false);
    expect(result.answer).toBe("API failover succeeded.");
    expect(result.attempts).toBe(1);
    expect(runtimeFactory).toHaveBeenCalledTimes(2);
    expect(runtimeFactory).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        env: {
          OPENAI_API_KEY: "sk-test"
        }
      })
    );
    expect(runtimeFactory).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        env: expect.objectContaining({
          CODEX_AUTH_MODE: "api",
          OPENAI_API_KEY: "sk-test",
          OPENAI_MODEL: "gpt-5.5",
          OPENAI_REASONING_EFFORT: "low"
        })
      })
    );
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toBe(prompts[0]);
  });

  it("default runner keeps ambient failures guarded from API failover", async () => {
    const scenarios = [
      {
        env: {
          CODEX_AUTH_MODE: "ambient",
          OPENAI_API_KEY: "sk-test"
        },
        message: "401 unauthorized",
        name: "explicit ambient auth"
      },
      {
        env: {},
        message: "not logged in",
        name: "missing API key"
      },
      {
        env: {
          OPENAI_API_KEY: "sk-test"
        },
        message: "network failed",
        name: "non-auth error"
      }
    ];

    for (const scenario of scenarios) {
      const runtimeFactory = vi.fn<CodexRuntimeFactory>(() =>
        createFakeCodexRuntime(async () => {
          throw new Error(`${scenario.name}: ${scenario.message}`);
        })
      );
      const engine = createAnalysisEngine({
        codexEnv: scenario.env,
        codexRuntimeFactory: runtimeFactory,
        snapshotProvider: createTestSnapshotProvider(),
        turnTimeoutMs: 60_000
      });

      const result = await engine.run({
        merchantId: `merchant-${scenario.name.replaceAll(" ", "-")}`,
        question: scenario.name
      });

      expect(result.fallback).toBe(true);
      expect(result.answer).toBe(ANALYSIS_FALLBACK_ANSWER);
      expect(runtimeFactory).toHaveBeenCalledTimes(1);
    }
  });

  it("returns the exact P2 known-answer values for the primary demo query", async () => {
    const runner = createWritingRunner(async ({ snapshotDirectory }) => {
      await writeAnalysisScript(
        snapshotDirectory,
        [
          "import { readFileSync, writeFileSync } from 'node:fs';",
          "const rows = readFileSync('revenue_by_region.csv', 'utf8');",
          "writeFileSync('result.json', JSON.stringify({ answer: 'computed' }));"
        ].join("\n")
      );
      await writeResult(snapshotDirectory, {
        answer:
          "West led May 2026 revenue at $2,366. Focus next month on West.",
        chart: {
          data: [
            { label: "Midwest", value: 235200 },
            { label: "Northeast", value: 183840 },
            { label: "South", value: 161280 },
            { label: "West", value: 236640 }
          ],
          type: "bar"
        },
        notes: [
          "Computed from paid orders between May 1, 2026 and June 1, 2026."
        ],
        table: {
          columns: ["Region", "Revenue Cents"],
          rows: [
            ["Midwest", 235200],
            ["Northeast", 183840],
            ["South", 161280],
            ["West", 236640]
          ]
        }
      });
    });
    const engine = createAnalysisEngine({
      runner,
      snapshotProvider: createTestSnapshotProvider(),
      turnTimeoutMs: 60_000
    });

    const result = await engine.run({
      merchantId: "merchant-aurora",
      question: MAY_2026_REVENUE_BY_REGION_QUERY
    });

    expect(result.fallback).toBe(false);
    expect(result.chart).toEqual({
      data: [
        { label: "Midwest", value: 235200 },
        { label: "Northeast", value: 183840 },
        { label: "South", value: 161280 },
        { label: "West", value: 236640 }
      ],
      type: "bar"
    });
    expect(result.table?.rows).toEqual([
      ["Midwest", 235200],
      ["Northeast", 183840],
      ["South", 161280],
      ["West", 236640]
    ]);
    expect(result.generatedCode).toContain("revenue_by_region.csv");
    expect(result.commandLog.length).toBeGreaterThan(0);
  });

  function createTestSnapshotProvider(): SnapshotProvider {
    return async ({ merchantId }) => {
      const directory = await mkdtemp(join(tempRoot, `${merchantId}-`));
      await mkdir(directory, { recursive: true });
      await writeFile(
        join(directory, "revenue_by_region.csv"),
        [
          "period,region,revenueCents,orderCount",
          "2026-05,Midwest,235200,1",
          "2026-05,Northeast,183840,1",
          "2026-05,South,161280,1",
          "2026-05,West,236640,1",
          ""
        ].join("\n")
      );
      const snapshot: TestSnapshot = {
        cleanup: vi.fn(async () => {
          snapshot.cleanupCalls += 1;
          await rm(directory, { force: true, recursive: true });
        }),
        cleanupCalls: 0,
        directory,
        files: {
          "data.csv": join(directory, "data.csv"),
          "data.json": join(directory, "data.json"),
          "data_dictionary.md": join(directory, "data_dictionary.md"),
          "monthly_revenue.csv": join(directory, "monthly_revenue.csv"),
          "revenue_by_category.csv": join(directory, "revenue_by_category.csv"),
          "revenue_by_region.csv": join(directory, "revenue_by_region.csv")
        }
      };
      snapshots.push(snapshot);
      return snapshot;
    };
  }
});

type TestSnapshot = MerchantSnapshot & {
  cleanupCalls: number;
};

function createWritingRunner(
  write: (input: {
    attempt: number;
    snapshotDirectory: string;
    timeoutMs: number;
  }) => Promise<void>
): AnalysisRunner {
  return {
    runTurn: vi.fn(async ({ attempt, signal, snapshotDirectory, timeoutMs }) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      await write({ attempt, snapshotDirectory, timeoutMs });
      return buildTurn([
        {
          changes: [{ kind: "add", path: "analysis.mjs" }],
          id: `file-${attempt}`,
          status: "completed",
          type: "file_change"
        },
        {
          aggregated_output: "Wrote result.json\n",
          command: "node analysis.mjs",
          exit_code: 0,
          id: `cmd-${attempt}`,
          status: "completed",
          type: "command_execution"
        }
      ]);
    })
  };
}

async function writeAnalysisScript(
  snapshotDirectory: string,
  code = "console.log('analysis');\n"
) {
  await writeFile(join(snapshotDirectory, "analysis.mjs"), code);
}

async function writeResult(snapshotDirectory: string, value: unknown) {
  await writeFile(join(snapshotDirectory, "result.json"), `${JSON.stringify(value)}\n`);
}

function buildTurn(items: ThreadItem[]): RunResult {
  return {
    finalResponse: "done",
    items,
    usage: null
  };
}

function createFakeCodexRuntime(
  run: (input: { prompt: string; signal?: AbortSignal }) => Promise<RunResult>
): ReturnType<CodexRuntimeFactory> {
  return {
    auth: {
      explicitAuthMode: false,
      mode: "ambient"
    },
    client: {
      startThread() {
        return {
          run(prompt: string, options: { signal?: AbortSignal } = {}) {
            return run({ prompt, signal: options.signal });
          }
        };
      }
    },
    threadOptions: {},
    turnTimeoutMs: 120_000
  } as ReturnType<CodexRuntimeFactory>;
}

function createStepClock(values: number[]) {
  let index = 0;

  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;
    index += 1;
    return value;
  };
}
