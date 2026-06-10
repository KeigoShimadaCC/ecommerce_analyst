import { describe, expect, it } from "vitest";
import { SNAPSHOT_FILE_NAMES } from "./snapshot";
import { buildAnalysisPrompt } from "./prompt";

describe("buildAnalysisPrompt", () => {
  it("includes the question, snapshot directory, and exact snapshot filenames", () => {
    const prompt = buildAnalysisPrompt({
      question: "Which region had the most revenue in May 2026?",
      snapshotDirectory: "/tmp/ecommerce-snapshot-test"
    });

    expect(prompt).toContain("Which region had the most revenue in May 2026?");
    expect(prompt).toContain("/tmp/ecommerce-snapshot-test");

    for (const fileName of SNAPSHOT_FILE_NAMES) {
      expect(prompt).toContain(`- ${fileName}`);
    }
  });

  it("tells the agent to prefer summary CSVs before raw data", () => {
    const prompt = buildAnalysisPrompt({
      question: "Show monthly revenue by category.",
      snapshotDirectory: "/tmp/ecommerce-snapshot-test"
    });

    expect(prompt).toContain(
      "Prefer revenue_by_region.csv for region revenue questions, including month-specific region breakdowns; filter by its YYYY-MM period column."
    );
    expect(prompt).toContain(
      "Prefer revenue_by_category.csv for category or product-category revenue questions, including month-specific category breakdowns; filter by its YYYY-MM period column."
    );
    expect(prompt).toContain(
      "Prefer monthly_revenue.csv for monthly revenue, trend, and time-series questions."
    );
    expect(prompt).toContain(
      "Use data.json or data.csv only when the summary CSV files cannot answer the question."
    );
  });

  it("requires durable script execution and file-based result validation", () => {
    const prompt = buildAnalysisPrompt({
      question: "What changed?",
      snapshotDirectory: "/tmp/ecommerce-snapshot-test"
    });

    expect(prompt).toContain("Create a durable analysis.mjs or analysis.py file");
    expect(prompt).toContain("Execute that script file from the snapshot directory.");
    expect(prompt).toContain("Do not run inline heredocs");
    expect(prompt).toContain("Do not use SDK structured outputs or output schemas.");
    expect(prompt).toContain("Write the final model-emitted result to result.json");
  });

  it("states the result contract with only model-emitted keys", () => {
    const prompt = buildAnalysisPrompt({
      question: "What changed?",
      snapshotDirectory: "/tmp/ecommerce-snapshot-test"
    });

    expect(prompt).toContain(
      "result.json must contain only these model-emitted keys: answer, table, chart, notes."
    );
    expect(prompt).toContain("answer is required and must be a string.");
    expect(prompt).toContain(
      'chart is optional and, when present, has type: "bar", "line", or "pie"'
    );
    expect(prompt).toContain(
      "Do not include app-captured fields such as generatedCode, commandLog, durationMs, attempts, or fallback."
    );
  });

  it("requires monetary chart values to stay as integer cents", () => {
    const prompt = buildAnalysisPrompt({
      question: "Chart paid revenue by region.",
      snapshotDirectory: "/tmp/ecommerce-snapshot-test"
    });

    expect(prompt).toContain(
      "For monetary chart metrics such as revenue, sales, cost, margin, AOV, or other money metrics, chart.data[].value must be integer cents from the snapshot files, not dollar values."
    );
    expect(prompt).toContain(
      "Example: $2,366.40 must be emitted as 236640."
    );
    expect(prompt).toContain(
      "The answer text may format monetary values as dollars for readability, but chart.data[].value for monetary metrics must remain integer cents."
    );
  });
});
