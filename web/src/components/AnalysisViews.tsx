import Link from "next/link";
import type {
  AnalysisChartPayload,
  AnalysisRunResult,
  AnalysisRunSummary
} from "../lib/analysis/result";

export function AnalysisHistoryList({
  runs
}: {
  runs: AnalysisRunSummary[];
}) {
  return (
    <section aria-labelledby="analysis-history-title" className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Saved analyses</p>
          <h1 id="analysis-history-title">Analysis history</h1>
        </div>
        <Link className="secondary-button link-button" href="/dashboard">
          Dashboard
        </Link>
      </div>

      {runs.length > 0 ? (
        <div className="analysis-list">
          {runs.map((run) => (
            <article className="analysis-list-item" key={run.id}>
              <div>
                <h2>{run.question}</h2>
                <p>{run.answer.answer}</p>
                <span>{formatDate(run.completedAt ?? run.createdAt)}</span>
              </div>
              <Link className="secondary-button link-button" href={`/analyses/${run.id}`}>
                Open
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">No saved analyses yet.</p>
      )}
    </section>
  );
}

export function AnalysisResultView({ run }: { run: AnalysisRunResult }) {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Saved analysis</p>
          <h1>Result</h1>
          <p className="dashboard-subtitle">{run.question}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button link-button" href="/analyses">
            History
          </Link>
          <Link className="secondary-button link-button" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </header>

      <section aria-labelledby="analysis-answer-title" className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Answer</p>
            <h2 id="analysis-answer-title">Recommendation</h2>
          </div>
          <span className={run.fallback ? "status-pill warning" : "status-pill"}>
            {run.fallback ? "Fallback" : "Complete"}
          </span>
        </div>
        <p className="analysis-answer">{run.answer.answer}</p>
        <p className="analysis-recommendation">{run.answer.recommendation}</p>
        {run.answer.highlights.length > 0 ? (
          <dl className="highlight-grid">
            {run.answer.highlights.map((highlight) => (
              <div key={highlight.label}>
                <dt>{highlight.label}</dt>
                <dd>{highlight.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {run.answer.notes.length > 0 ? (
          <ul className="analysis-notes">
            {run.answer.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <AnalysisChartPanel chart={run.chart} />

      <section aria-labelledby="generated-code-title" className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Work trail</p>
            <h2 id="generated-code-title">Generated code</h2>
          </div>
        </div>
        <pre className="code-panel">
          <code>
            {run.generatedCode.trim().length > 0
              ? run.generatedCode
              : "No generated code was captured."}
          </code>
        </pre>
      </section>

      <section aria-labelledby="command-log-title" className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Execution</p>
            <h2 id="command-log-title">Command log</h2>
          </div>
        </div>
        <pre className="code-panel">
          <code>
            {run.commandLog.trim().length > 0
              ? run.commandLog
              : "No command entries were captured."}
          </code>
        </pre>
      </section>
    </main>
  );
}

export function AnalysisChartPanel({ chart }: { chart: AnalysisChartPayload }) {
  if (chart.data.length === 0) {
    return (
      <section aria-labelledby="analysis-chart-title" className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Chart</p>
            <h2 id="analysis-chart-title">{chart.title}</h2>
          </div>
        </div>
        <p className="empty-state">No chart data is available.</p>
      </section>
    );
  }

  const maxValue = Math.max(...chart.data.map((point) => point.value), 1);

  return (
    <section aria-labelledby="analysis-chart-title" className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Chart</p>
          <h2 id="analysis-chart-title">{chart.title}</h2>
        </div>
      </div>
      <div className="trend-content">
        <div aria-label={chart.title} className="bar-chart analysis-bars">
          {chart.data.map((point) => {
            const heightPercent =
              point.value > 0 ? Math.max((point.value / maxValue) * 100, 4) : 0;

            return (
              <div className="bar-column" key={point.label}>
                <div className="bar-track">
                  <div
                    aria-label={`${point.label} ${formatChartValue(
                      point.value,
                      chart.unit
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
              <th scope="col">{chart.xLabel}</th>
              <th scope="col">{chart.yLabel}</th>
            </tr>
          </thead>
          <tbody>
            {chart.data.map((point) => (
              <tr key={point.label}>
                <th scope="row">{point.label}</th>
                <td>{formatChartValue(point.value, chart.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatChartValue(value: number, unit: AnalysisChartPayload["unit"]) {
  if (unit === "currency_cents") {
    return formatCurrencyFromCents(value);
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrencyFromCents(cents: number) {
  return formatCurrencyFromDollars(cents / 100);
}

function formatCurrencyFromDollars(dollars: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(dollars);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
