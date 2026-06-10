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
          <Link
            className="secondary-button link-button"
            href={`/analyses/${run.id}/proof`}
          >
            Proof JSON
          </Link>
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
        <pre className="code-panel generated-code-panel">
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
        <pre className="code-panel command-log-panel">
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
      <div className="analysis-chart-content">
        <div aria-label={chart.title} className="analysis-bar-list" role="list">
          {chart.data.map((point) => {
            const widthPercent =
              point.value > 0 ? Math.max((point.value / maxValue) * 100, 3) : 0;
            const formattedValue = formatChartValue(point.value, chart.unit);

            return (
              <div
                aria-label={`${point.label} ${formattedValue}`}
                className="analysis-bar-row"
                key={point.label}
                role="listitem"
              >
                <div className="analysis-bar-label">{point.label}</div>
                <div aria-hidden="true" className="analysis-bar-track">
                  <div
                    className="analysis-bar-fill"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <div className="analysis-bar-value">{formattedValue}</div>
              </div>
            );
          })}
        </div>
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
