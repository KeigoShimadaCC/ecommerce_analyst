"use server";

import { redirect } from "next/navigation";
import { getAnalysisDatabase } from "../../lib/analysis/database";
import { persistAnalysisEngineResult } from "../../lib/analysis/runs";
import { requireCurrentSession, type AuthenticatedSession } from "../../lib/auth";
import {
  createAnalysisEngine,
  type AnalysisEngine
} from "../../lib/codex/engine";

type SubmitAnalysisActionDependencies = {
  createEngine: () => AnalysisEngine;
  persistRun: (
    session: AuthenticatedSession,
    question: string,
    result: Awaited<ReturnType<AnalysisEngine["run"]>>
  ) => { id: string };
  redirectTo: (path: string) => void;
  requireSession: () => Promise<AuthenticatedSession>;
};

export async function submitAnalysisAction(formData: FormData) {
  await submitAnalysisActionWithDependencies(
    formData,
    createProductionSubmitDependencies()
  );
}

export async function submitAnalysisActionWithDependencies(
  formData: FormData,
  dependencies: SubmitAnalysisActionDependencies
) {
  const session = await dependencies.requireSession();
  const questionValue = formData.get("question");
  const question =
    typeof questionValue === "string" && questionValue.trim().length > 0
      ? normalizeQuestion(questionValue)
      : "Summarize my store performance.";
  const result = await dependencies.createEngine().run({
    merchantId: session.merchantId,
    question
  });
  const run = dependencies.persistRun(session, question, result);

  dependencies.redirectTo(`/analyses/${run.id}`);
}

function createProductionSubmitDependencies(): SubmitAnalysisActionDependencies {
  const database = getAnalysisDatabase();

  return {
    createEngine: () => createAnalysisEngine({ database }),
    persistRun: persistAnalysisEngineResult,
    redirectTo: redirect,
    requireSession: requireCurrentSession
  };
}

function normalizeQuestion(question: string) {
  return question.trim().replace(/\s+/g, " ");
}
