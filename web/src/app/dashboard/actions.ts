"use server";

import { redirect } from "next/navigation";
import { requireCurrentSession } from "../../lib/auth";
import { createStubAnalysisRun } from "../../lib/analysis/runs";

export async function submitAnalysisAction(formData: FormData) {
  const session = await requireCurrentSession();
  const questionValue = formData.get("question");
  const question =
    typeof questionValue === "string" && questionValue.trim().length > 0
      ? questionValue
      : "Summarize my store performance.";
  const run = createStubAnalysisRun(session, question);

  redirect(`/analyses/${run.id}`);
}
