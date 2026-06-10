import { notFound } from "next/navigation";
import { AnalysisResultView } from "../../../components/AnalysisViews";
import { requireCurrentSession } from "../../../lib/auth";
import { getAnalysisRunById } from "../../../lib/analysis/runs";

type AnalysisResultPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AnalysisResultPage({
  params
}: AnalysisResultPageProps) {
  const session = await requireCurrentSession();
  const { id } = await params;
  const run = getAnalysisRunById(session, id);

  if (!run) {
    notFound();
  }

  return <AnalysisResultView run={run} />;
}
