import { DashboardView } from "../../components/DashboardView";
import { requireCurrentSession } from "../../lib/auth";
import { getDashboardData } from "../../lib/dashboard/data";
import { submitAnalysisAction } from "./actions";

export default async function DashboardPage() {
  const session = await requireCurrentSession();
  const data = getDashboardData(session);

  return <DashboardView askAction={submitAnalysisAction} data={data} />;
}
