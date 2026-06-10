import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunResult } from "@openai/codex-sdk";
import {
  type AnalysisEngineResult,
  type AnalysisModelResult,
  validateModelResult
} from "../analysis/result";
import {
  CODEX_AUTH_MODE_ENV,
  CODEX_TURN_TIMEOUT_MS,
  OPENAI_API_KEY_ENV,
  OPENAI_MODEL_ENV,
  OPENAI_REASONING_EFFORT_ENV,
  createCodexRuntime,
  resolveApiAuthFailover,
  type CodexApiAuth,
  type CodexRuntimeEnv,
  type CreateCodexRuntimeOptions
} from "./client";
import { buildAnalysisPrompt } from "./prompt";
import {
  createMerchantSnapshot,
  type CreateMerchantSnapshotOptions,
  type MerchantSnapshot
} from "./snapshot";
import { captureWorkTrail, type WorkTrailTurn } from "./work-trail";

export const ANALYSIS_FALLBACK_ANSWER =
  "I couldn't complete this analysis reliably.";
export const CODEX_RETRY_MINIMUM_REMAINING_MS = 40_000;
export const CODEX_MAX_ENGINE_ATTEMPTS = 2;

export type AnalysisEngineRequest = {
  merchantId: string;
  question: string;
};

export type SnapshotProvider = (
  input: Pick<AnalysisEngineRequest, "merchantId">
) => Promise<MerchantSnapshot>;

export type AnalysisRunnerInput = {
  attempt: number;
  prompt: string;
  signal: AbortSignal;
  snapshotDirectory: string;
  timeoutMs: number;
};

export type AnalysisRunner = {
  runTurn(input: AnalysisRunnerInput): Promise<RunResult>;
};

type CodexRuntime = ReturnType<typeof createCodexRuntime>;

export type CodexRuntimeFactory = (
  options?: CreateCodexRuntimeOptions
) => CodexRuntime;

export type AnalysisPersistence = {
  persist(input: {
    merchantId: string;
    question: string;
    result: AnalysisEngineResult;
  }): Promise<void> | void;
};

export type CreateAnalysisEngineOptions = {
  codexEnv?: CodexRuntimeEnv;
  codexRuntimeFactory?: CodexRuntimeFactory;
  database?: CreateMerchantSnapshotOptions["database"];
  now?: () => number;
  persistence?: AnalysisPersistence;
  retryMinimumRemainingMs?: number;
  runner?: AnalysisRunner;
  snapshotProvider?: SnapshotProvider;
  tempRoot?: string;
  turnTimeoutMs?: number;
};

export type AnalysisEngine = {
  run(request: AnalysisEngineRequest): Promise<AnalysisEngineResult>;
};

class AnalysisTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Codex turn timed out after ${timeoutMs}ms`);
    this.name = "AnalysisTimeoutError";
  }
}

export function createAnalysisEngine(
  options: CreateAnalysisEngineOptions = {}
): AnalysisEngine {
  const now = options.now ?? Date.now;
  const turnTimeoutMs = options.turnTimeoutMs ?? CODEX_TURN_TIMEOUT_MS;
  const retryMinimumRemainingMs =
    options.retryMinimumRemainingMs ?? CODEX_RETRY_MINIMUM_REMAINING_MS;
  const snapshotProvider =
    options.snapshotProvider ??
    createDefaultSnapshotProvider(options.database, options.tempRoot);
  const runner =
    options.runner ??
    createDefaultCodexRunner({
      env: options.codexEnv,
      runtimeFactory: options.codexRuntimeFactory
    });
  const persistence = options.persistence ?? noopPersistence;

  return {
    async run(request) {
      const startedAt = now();
      let attempts = 0;
      let snapshot: MerchantSnapshot | null = null;
      const turns: WorkTrailTurn[] = [];

      try {
        snapshot = await snapshotProvider({ merchantId: request.merchantId });
        let lastFailureReason = "result.json was not validated";

        while (attempts < CODEX_MAX_ENGINE_ATTEMPTS) {
          const remainingBudgetMs = getRemainingBudgetMs({
            now,
            startedAt,
            totalBudgetMs: turnTimeoutMs
          });

          if (remainingBudgetMs <= 0) {
            const fallback = await buildFallbackResult({
              attempts,
              durationMs: now() - startedAt,
              reason: `analysis budget exhausted after ${turnTimeoutMs}ms`,
              snapshotDirectory: snapshot.directory,
              turns
            });
            await persistence.persist({
              merchantId: request.merchantId,
              question: request.question,
              result: fallback
            });
            return fallback;
          }

          attempts += 1;
          const prompt =
            attempts === 1
              ? buildAnalysisPrompt({
                  question: request.question,
                  snapshotDirectory: snapshot.directory
                })
              : buildCorrectivePrompt({
                  failureReason: lastFailureReason,
                  question: request.question,
                  snapshotDirectory: snapshot.directory
                });

          const turn = await runTurnWithTimeout({
            attempt: attempts,
            prompt,
            runner,
            snapshotDirectory: snapshot.directory,
            timeoutMs: remainingBudgetMs
          });
          turns.push(turn);

          const modelResult = await readAndValidateModelResult(
            snapshot.directory
          ).catch((error) => {
            lastFailureReason = describeError(error);
            return null;
          });

          if (modelResult) {
            const result = await buildEngineResult({
              attempts,
              durationMs: now() - startedAt,
              fallback: false,
              modelResult,
              snapshotDirectory: snapshot.directory,
              turns
            });
            await persistence.persist({
              merchantId: request.merchantId,
              question: request.question,
              result
            });
            return result;
          }

          if (
            attempts >= CODEX_MAX_ENGINE_ATTEMPTS ||
            getRemainingBudgetMs({
              now,
              startedAt,
              totalBudgetMs: turnTimeoutMs
            }) < retryMinimumRemainingMs
          ) {
            const fallback = await buildFallbackResult({
              attempts,
              durationMs: now() - startedAt,
              reason: lastFailureReason,
              snapshotDirectory: snapshot.directory,
              turns
            });
            await persistence.persist({
              merchantId: request.merchantId,
              question: request.question,
              result: fallback
            });
            return fallback;
          }
        }

        const fallback = await buildFallbackResult({
          attempts,
          durationMs: now() - startedAt,
          reason: lastFailureReason,
          snapshotDirectory: snapshot.directory,
          turns
        });
        await persistence.persist({
          merchantId: request.merchantId,
          question: request.question,
          result: fallback
        });
        return fallback;
      } catch (error) {
        console.error("Analysis engine dependency failed", {
          error,
          merchantId: request.merchantId
        });
        const fallback = await buildFallbackResult({
          attempts,
          durationMs: now() - startedAt,
          reason: describeError(error),
          snapshotDirectory: snapshot?.directory ?? null,
          turns
        });
        await persistFallbackAfterFailure({
          merchantId: request.merchantId,
          persistence,
          question: request.question,
          result: fallback
        });
        return fallback;
      } finally {
        if (snapshot) {
          try {
            await snapshot.cleanup();
          } catch (error) {
            console.error("Failed to clean up merchant snapshot", {
              directory: snapshot.directory,
              error
            });
          }
        }
      }
    }
  };
}

function createDefaultSnapshotProvider(
  database: CreateMerchantSnapshotOptions["database"] | undefined,
  tempRoot: string | undefined
): SnapshotProvider {
  return async ({ merchantId }) => {
    if (!database) {
      throw new Error(
        "createAnalysisEngine requires either a snapshotProvider or database"
      );
    }

    return createMerchantSnapshot({
      database,
      merchantId,
      ...(tempRoot ? { tempRoot } : {})
    });
  };
}

function getRemainingBudgetMs({
  now,
  startedAt,
  totalBudgetMs
}: {
  now: () => number;
  startedAt: number;
  totalBudgetMs: number;
}) {
  return Math.max(totalBudgetMs - (now() - startedAt), 0);
}

function createDefaultCodexRunner({
  env = process.env,
  runtimeFactory = createCodexRuntime
}: {
  env?: CodexRuntimeEnv;
  runtimeFactory?: CodexRuntimeFactory;
} = {}): AnalysisRunner {
  return {
    async runTurn({ prompt, signal, snapshotDirectory }) {
      try {
        return await runCodexPrompt({
          env,
          prompt,
          runtimeFactory,
          signal,
          snapshotDirectory
        });
      } catch (error) {
        const failoverAuth = resolveApiAuthFailover(error, env);

        if (!failoverAuth) {
          throw error;
        }

        return runCodexPrompt({
          env: buildApiFailoverEnv(env, failoverAuth),
          prompt,
          runtimeFactory,
          signal,
          snapshotDirectory
        });
      }
    }
  };
}

async function runCodexPrompt({
  env,
  prompt,
  runtimeFactory,
  signal,
  snapshotDirectory
}: {
  env: CodexRuntimeEnv;
  prompt: string;
  runtimeFactory: CodexRuntimeFactory;
  signal: AbortSignal;
  snapshotDirectory: string;
}) {
  const runtime = runtimeFactory({ env, workingDirectory: snapshotDirectory });
  const thread = runtime.client.startThread(runtime.threadOptions);
  return thread.run(prompt, { signal });
}

function buildApiFailoverEnv(
  env: CodexRuntimeEnv,
  auth: CodexApiAuth
): CodexRuntimeEnv {
  return {
    ...env,
    [CODEX_AUTH_MODE_ENV]: "api",
    [OPENAI_API_KEY_ENV]: auth.apiKey,
    [OPENAI_MODEL_ENV]: auth.model,
    [OPENAI_REASONING_EFFORT_ENV]: auth.modelReasoningEffort
  };
}

async function runTurnWithTimeout({
  attempt,
  prompt,
  runner,
  snapshotDirectory,
  timeoutMs
}: {
  attempt: number;
  prompt: string;
  runner: AnalysisRunner;
  snapshotDirectory: string;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const runnerPromise = runner.runTurn({
    attempt,
    prompt,
    signal: controller.signal,
    snapshotDirectory,
    timeoutMs
  });
  runnerPromise.catch((error) => {
    if (timedOut) {
      console.error("Codex runner settled after timeout", { attempt, error });
    }
  });

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new AnalysisTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([runnerPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function readAndValidateModelResult(
  snapshotDirectory: string
): Promise<AnalysisModelResult> {
  const resultPath = join(snapshotDirectory, "result.json");
  let rawResult: string;

  try {
    rawResult = await readFile(resultPath, "utf8");
  } catch (error) {
    throw new Error(`missing result file: ${describeError(error)}`);
  }

  let parsedResult: unknown;
  try {
    parsedResult = JSON.parse(rawResult);
  } catch (error) {
    throw new Error(`invalid result JSON: ${describeError(error)}`);
  }

  try {
    return validateModelResult(parsedResult);
  } catch (error) {
    throw new Error(`result schema validation failed: ${describeError(error)}`);
  }
}

async function buildEngineResult({
  attempts,
  durationMs,
  fallback,
  modelResult,
  snapshotDirectory,
  turns
}: {
  attempts: number;
  durationMs: number;
  fallback: boolean;
  modelResult: AnalysisModelResult;
  snapshotDirectory: string | null;
  turns: WorkTrailTurn[];
}): Promise<AnalysisEngineResult> {
  const trail = snapshotDirectory
    ? await captureWorkTrail({ snapshotDirectory, turns })
    : { commandLog: [], generatedCode: "" };

  return {
    ...modelResult,
    attempts,
    commandLog: trail.commandLog,
    durationMs,
    fallback,
    generatedCode: trail.generatedCode
  };
}

async function buildFallbackResult({
  attempts,
  durationMs,
  reason,
  snapshotDirectory,
  turns
}: {
  attempts: number;
  durationMs: number;
  reason: string;
  snapshotDirectory: string | null;
  turns: WorkTrailTurn[];
}): Promise<AnalysisEngineResult> {
  return buildEngineResult({
    attempts,
    durationMs,
    fallback: true,
    modelResult: {
      answer: ANALYSIS_FALLBACK_ANSWER,
      notes: [`Reason: ${reason}`]
    },
    snapshotDirectory,
    turns
  });
}

function buildCorrectivePrompt({
  failureReason,
  question,
  snapshotDirectory
}: {
  failureReason: string;
  question: string;
  snapshotDirectory: string;
}) {
  return `${buildAnalysisPrompt({ question, snapshotDirectory })}

The previous result.json could not be accepted:
${failureReason}

Correct result.json in place. Keep the same file-based contract and do not include app-captured fields.`;
}

async function persistFallbackAfterFailure({
  merchantId,
  persistence,
  question,
  result
}: {
  merchantId: string;
  persistence: AnalysisPersistence;
  question: string;
  result: AnalysisEngineResult;
}) {
  try {
    await persistence.persist({ merchantId, question, result });
  } catch (error) {
    console.error("Failed to persist fallback analysis result", {
      error,
      merchantId
    });
  }
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "unknown error";
}

const noopPersistence: AnalysisPersistence = {
  persist() {
    return undefined;
  }
};
