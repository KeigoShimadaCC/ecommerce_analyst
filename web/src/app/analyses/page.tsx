import { AnalysisHistoryList } from "../../components/AnalysisViews";
import { requireCurrentSession } from "../../lib/auth";
import { listAnalysisRuns } from "../../lib/analysis/runs";

export default async function AnalysesPage() {
  const session = await requireCurrentSession();
  const runs = listAnalysisRuns(session);

  return (
    <main className="dashboard-shell">
      <AnalysisHistoryList runs={runs} />
    </main>
  );
}
