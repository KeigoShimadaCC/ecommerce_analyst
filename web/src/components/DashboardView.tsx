import Link from "next/link";
import type { DashboardData, MonthlyRevenuePoint } from "../lib/dashboard/data";

type DashboardViewProps = {
  askAction?: (formData: FormData) => Promise<void>;
  data: DashboardData;
};

export function DashboardView({ askAction, data }: DashboardViewProps) {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Merchant dashboard</p>
          <h1>{data.merchantName}</h1>
          <p className="dashboard-subtitle">
            Latest paid-order performance for {data.ownerName}.
          </p>
        </div>
        <form action="/logout" method="post">
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <section aria-labelledby="ask-analyst-title" className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Ask</p>
            <h2 id="ask-analyst-title">Ask a store question</h2>
            <p>
              Submit a deterministic Phase 01 analysis and save it to history.
            </p>
          </div>
          <Link className="secondary-button link-button" href="/analyses">
            History
          </Link>
        </div>
        <form action={askAction} className="ask-form">
          <label htmlFor="analysis-question">Question</label>
          <textarea
            defaultValue="For May 2026, show total revenue by region as a bar chart and recommend the region to focus next month."
            id="analysis-question"
            name="question"
            required
            rows={3}
          />
          <button className="primary-button" type="submit">
            Run analysis
          </button>
        </form>
      </section>

      <section aria-label="Key performance indicators" className="kpi-grid">
        {data.kpis.map((metric) => (
          <article className="kpi-tile" key={metric.id}>
            <p className="kpi-label">{metric.label}</p>
            <strong className="kpi-value">{metric.value}</strong>
            <p className="kpi-detail">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="revenue-trend-title"
        className="dashboard-panel trend-panel"
      >
        <div className="panel-heading">
          <div>
            <h2 id="revenue-trend-title">Monthly revenue trend</h2>
            <p>{data.periodLabel}</p>
          </div>
        </div>
        <RevenueTrend points={data.monthlyRevenue} />
      </section>
    </main>
  );
}

export function RevenueTrend({ points }: { points: MonthlyRevenuePoint[] }) {
  if (points.length === 0) {
    return <p className="empty-state">No revenue trend data is available.</p>;
  }

  const maxRevenue = Math.max(
    ...points.map((point) => point.revenueCents),
    1
  );

  return (
    <div className="trend-content">
      <div aria-label="Latest six-month revenue bars" className="bar-chart">
        {points.map((point) => {
          const heightPercent =
            point.revenueCents > 0
              ? Math.max((point.revenueCents / maxRevenue) * 100, 4)
              : 0;

          return (
            <div className="bar-column" key={point.month}>
              <div className="bar-track">
                <div
                  aria-label={`${point.label} revenue ${formatCurrency(
                    point.revenueCents
                  )}`}
                  className="bar-fill"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span>{point.label}</span>
            </div>
          );
        })}
      </div>

      <table className="trend-table">
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
            <th scope="col">Margin</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.label}</th>
              <td>{formatCurrency(point.revenueCents)}</td>
              <td>{formatInteger(point.orderCount)}</td>
              <td>{formatCurrency(point.marginCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(cents / 100);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
