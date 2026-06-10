import { SNAPSHOT_FILE_NAMES } from "./snapshot";

export type BuildAnalysisPromptOptions = {
  question: string;
  snapshotDirectory: string;
};

export function buildAnalysisPrompt({
  question,
  snapshotDirectory
}: BuildAnalysisPromptOptions) {
  return `You are analyzing an ecommerce merchant snapshot.

Question:
${question}

Snapshot directory:
${snapshotDirectory}

Available snapshot files, with exact names:
${SNAPSHOT_FILE_NAMES.map((fileName) => `- ${fileName}`).join("\n")}

Use the smallest reliable input that answers the question:
- Prefer revenue_by_region.csv for region revenue questions, including month-specific region breakdowns; filter by its YYYY-MM period column.
- Prefer revenue_by_category.csv for category or product-category revenue questions, including month-specific category breakdowns; filter by its YYYY-MM period column.
- Prefer monthly_revenue.csv for monthly revenue, trend, and time-series questions.
- Use data.json or data.csv only when the summary CSV files cannot answer the question.
- Read data_dictionary.md before interpreting columns. All revenue and cost amounts are integer cents.

Execution requirements:
- Create a durable analysis.mjs or analysis.py file in the snapshot directory.
- Execute that script file from the snapshot directory.
- Do not run inline heredocs such as "python - <<'PY'" or "node <<'JS'".
- Do not use SDK structured outputs or output schemas.
- Write the final model-emitted result to result.json in the snapshot directory.

result.json contract:
- result.json must be valid JSON.
- result.json must contain only these model-emitted keys: answer, table, chart, notes.
- answer is required and must be a string.
- table is optional and, when present, has columns: string[] and rows: arrays of strings, numbers, booleans, or nulls.
- chart is optional and, when present, has type: "bar", "line", or "pie" and data: [{ "label": string, "value": number }].
- For monetary chart metrics such as revenue, sales, cost, margin, AOV, or other money metrics, chart.data[].value must be integer cents from the snapshot files, not dollar values. Example: $2,366.40 must be emitted as 236640.
- The answer text may format monetary values as dollars for readability, but chart.data[].value for monetary metrics must remain integer cents.
- notes is optional and, when present, is string[].
- Do not include app-captured fields such as generatedCode, commandLog, durationMs, attempts, or fallback.

Return a concise final response after result.json is written.`;
}
