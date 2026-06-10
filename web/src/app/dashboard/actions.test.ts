import { describe, expect, it, vi } from "vitest";
import { submitAnalysisActionWithDependencies } from "./actions";
import type { AuthenticatedSession } from "../../lib/auth";
import type { AnalysisEngineResult } from "../../lib/analysis/result";

describe("submitAnalysisActionWithDependencies", () => {
  it("runs the engine for the authenticated merchant, persists, and redirects", async () => {
    const run = vi.fn().mockResolvedValue(buildEngineResult());
    const persistRun = vi.fn().mockReturnValue({ id: "analysis-engine-1" });
    const redirectTo = vi.fn();
    const formData = new FormData();
    formData.set("question", "  Which region led May revenue?  ");
    formData.set("merchantId", "merchant-from-form");

    await submitAnalysisActionWithDependencies(formData, {
      createEngine: () => ({ run }),
      persistRun,
      redirectTo,
      requireSession: async () => buildSession()
    });

    expect(run).toHaveBeenCalledWith({
      merchantId: "merchant-session",
      question: "Which region led May revenue?"
    });
    expect(persistRun).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: "merchant-session",
        userId: "user-session"
      }),
      "Which region led May revenue?",
      expect.objectContaining({
        commandLog: [
          expect.objectContaining({
            command: "node analysis.mjs"
          })
        ],
        generatedCode: "console.log('analysis.mjs');"
      })
    );
    expect(redirectTo).toHaveBeenCalledWith("/analyses/analysis-engine-1");
  });
});

function buildSession(): AuthenticatedSession {
  return {
    email: "owner@example.test",
    expiresAt: new Date("2026-06-11T00:00:00.000Z"),
    merchantId: "merchant-session",
    merchantName: "Session Merchant",
    merchantSlug: "session-merchant",
    name: "Session Owner",
    role: "owner",
    sessionId: "session-1",
    userId: "user-session"
  };
}

function buildEngineResult(): AnalysisEngineResult {
  return {
    answer: "West led May revenue.",
    attempts: 1,
    commandLog: [
      {
        command: "node analysis.mjs",
        exitCode: 0,
        output: "Wrote result.json",
        status: "completed"
      }
    ],
    durationMs: 250,
    fallback: false,
    generatedCode: "console.log('analysis.mjs');"
  };
}
