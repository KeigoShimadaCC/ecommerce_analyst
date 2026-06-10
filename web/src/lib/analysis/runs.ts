import { randomUUID } from "node:crypto";
import type { AuthenticatedSession } from "../auth";
import {
  getMay2026RevenueByRegion,
  MAY_2026_REVENUE_BY_REGION_QUERY
} from "../analytics/knownAnswer";
import { getAnalysisDatabase } from "./database";
import {
  type AnalysisAnswerPayload,
  type AnalysisChartPayload,
  type AnalysisRunResult,
  type AnalysisRunSummary,
  type AnalysisRuntimeMetadata,
  validateAnswerPayload,
  validateChartPayload,
  validateRuntimeMetadata
} from "./result";

export type AnalysisDatabase = {
  prepare(sql: string): {
    all(...values: unknown[]): Array<Record<string, unknown>>;
    get(...values: unknown[]): unknown;
    run(...values: unknown[]): { changes?: bigint | number };
  };
};

type AnalysisRunRow = {
  answerPayloadJson: string;
  attempts: number | bigint;
  chartPayloadJson: string;
  commandLog: string;
  completedAt: string | null;
  createdAt: string;
  fallback: number | bigint | boolean;
  generatedCode: string;
  id: string;
  merchantId: string;
  question: string;
  runtimeMetadataJson: string;
  updatedAt: string;
  userId: string | null;
};

type PersistableAnalysis = {
  answer: AnalysisAnswerPayload;
  chart: AnalysisChartPayload;
  commandLog: string;
  completedAt: Date;
  fallback: boolean;
  generatedCode: string;
  runtimeMetadata: AnalysisRuntimeMetadata;
};

export function createStubAnalysisRun(
  session: AuthenticatedSession,
  question: string
) {
  return createStubAnalysisRunForSession(
    getAnalysisDatabase(),
    session,
    question
  );
}

export function createStubAnalysisRunForSession(
  database: AnalysisDatabase,
  session: AuthenticatedSession,
  question: string
): AnalysisRunResult {
  const normalizedQuestion = normalizeQuestion(question);
  const completedAt = new Date();
  const payload =
    normalizedQuestion === normalizeQuestion(MAY_2026_REVENUE_BY_REGION_QUERY)
      ? buildKnownAnswerPayload(database, session.merchantId, completedAt)
      : buildFallbackPayload(normalizedQuestion, completedAt);
  const id = `analysis-${randomUUID()}`;
  const timestamp = completedAt.toISOString();

  database
    .prepare(
      `
        INSERT INTO "AnalysisRun" (
          "id",
          "merchantId",
          "userId",
          "question",
          "answerPayloadJson",
          "chartPayloadJson",
          "generatedCode",
          "commandLog",
          "runtimeMetadataJson",
          "attempts",
          "fallback",
          "createdAt",
          "updatedAt",
          "completedAt"
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      id,
      session.merchantId,
      session.userId,
      normalizedQuestion,
      JSON.stringify(payload.answer),
      JSON.stringify(payload.chart),
      payload.generatedCode,
      payload.commandLog,
      JSON.stringify(payload.runtimeMetadata),
      1,
      payload.fallback ? 1 : 0,
      timestamp,
      timestamp,
      timestamp
    );

  return {
    answer: payload.answer,
    attempts: 1,
    chart: payload.chart,
    commandLog: payload.commandLog,
    completedAt,
    createdAt: completedAt,
    fallback: payload.fallback,
    generatedCode: payload.generatedCode,
    id,
    merchantId: session.merchantId,
    question: normalizedQuestion,
    runtimeMetadata: payload.runtimeMetadata,
    updatedAt: completedAt,
    userId: session.userId
  };
}

export function listAnalysisRuns(session: AuthenticatedSession) {
  return listAnalysisRunsForSession(getAnalysisDatabase(), session);
}

export function listAnalysisRunsForSession(
  database: AnalysisDatabase,
  session: Pick<AuthenticatedSession, "merchantId">
): AnalysisRunSummary[] {
  return database
    .prepare(
      `
        SELECT
          "id",
          "merchantId",
          "userId",
          "question",
          "answerPayloadJson",
          "chartPayloadJson",
          "generatedCode",
          "commandLog",
          "runtimeMetadataJson",
          "attempts",
          "fallback",
          "createdAt",
          "updatedAt",
          "completedAt"
        FROM "AnalysisRun"
        WHERE "merchantId" = ?
        ORDER BY "createdAt" DESC
      `
    )
    .all(session.merchantId)
    .map((row) => toAnalysisRun(assertAnalysisRunRow(row)))
    .map((run) => ({
      answer: run.answer,
      completedAt: run.completedAt,
      createdAt: run.createdAt,
      fallback: run.fallback,
      id: run.id,
      question: run.question,
      updatedAt: run.updatedAt
    }));
}

export function getAnalysisRunById(
  session: AuthenticatedSession,
  analysisId: string
) {
  return getAnalysisRunByIdForSession(
    getAnalysisDatabase(),
    session,
    analysisId
  );
}

export function getAnalysisRunByIdForSession(
  database: AnalysisDatabase,
  session: Pick<AuthenticatedSession, "merchantId">,
  analysisId: string
): AnalysisRunResult | null {
  const row = database
    .prepare(
      `
        SELECT
          "id",
          "merchantId",
          "userId",
          "question",
          "answerPayloadJson",
          "chartPayloadJson",
          "generatedCode",
          "commandLog",
          "runtimeMetadataJson",
          "attempts",
          "fallback",
          "createdAt",
          "updatedAt",
          "completedAt"
        FROM "AnalysisRun"
        WHERE "id" = ?
          AND "merchantId" = ?
        LIMIT 1
      `
    )
    .get(analysisId, session.merchantId);

  if (!isAnalysisRunRow(row)) {
    return null;
  }

  return toAnalysisRun(row);
}

function buildKnownAnswerPayload(
  database: AnalysisDatabase,
  merchantId: string,
  completedAt: Date
): PersistableAnalysis {
  const knownAnswer = getMay2026RevenueByRegion(database, merchantId);
  const leadingBar = knownAnswer.chart.bars.find(
    (bar) => bar.region === knownAnswer.leadingRegion
  );
  const chart: AnalysisChartPayload = {
    data: knownAnswer.chart.bars.map((bar) => ({
      label: bar.region,
      value: bar.revenueCents
    })),
    title: "May 2026 revenue by region",
    type: "bar",
    unit: "currency_cents",
    xLabel: "Region",
    yLabel: "Revenue"
  };
  const answer: AnalysisAnswerPayload = {
    answer: `West led May 2026 revenue at ${formatCurrency(
      leadingBar?.revenueCents ?? 0
    )}. ${knownAnswer.recommendation}`,
    fallback: false,
    highlights: knownAnswer.chart.bars.map((bar) => ({
      label: bar.region,
      value: formatCurrency(bar.revenueCents)
    })),
    notes: [
      "Computed from paid orders between May 1, 2026 and June 1, 2026.",
      "Revenue is grouped by the order region for the authenticated merchant."
    ],
    recommendation: knownAnswer.recommendation
  };

  return {
    answer,
    chart,
    commandLog: buildCommandLog(true),
    completedAt,
    fallback: false,
    generatedCode: buildGeneratedCode(true),
    runtimeMetadata: buildRuntimeMetadata(completedAt, true)
  };
}

function buildFallbackPayload(
  question: string,
  completedAt: Date
): PersistableAnalysis {
  const answer: AnalysisAnswerPayload = {
    answer:
      "I couldn't complete this analysis reliably in the Phase 01 deterministic stub, but the question has been saved for review.",
    fallback: true,
    highlights: [],
    notes: [
      "The question did not match a pre-registered deterministic analysis.",
      "No live runtime or external command was called for this stub result."
    ],
    recommendation:
      "Try the May 2026 revenue-by-region demo question to see a computed chart."
  };
  const chart: AnalysisChartPayload = {
    data: [],
    title: "No deterministic chart available",
    type: "bar",
    unit: "currency_cents",
    xLabel: "Category",
    yLabel: "Value"
  };

  return {
    answer,
    chart,
    commandLog: buildCommandLog(false),
    completedAt,
    fallback: true,
    generatedCode: buildGeneratedCode(false, question),
    runtimeMetadata: buildRuntimeMetadata(completedAt, false)
  };
}

function buildRuntimeMetadata(
  completedAt: Date,
  matchedKnownAnswer: boolean
): AnalysisRuntimeMetadata {
  return {
    completedAt: completedAt.toISOString(),
    durationMs: 0,
    matchedKnownAnswer,
    mode: "deterministic-stub"
  };
}

function buildGeneratedCode(matchedKnownAnswer: boolean, question?: string) {
  const questionLine = question
    ? `const question = ${JSON.stringify(question)};`
    : `const question = ${JSON.stringify(MAY_2026_REVENUE_BY_REGION_QUERY)};`;

  return [
    "// Phase 01 deterministic stub analysis",
    questionLine,
    `const matchedKnownAnswer = ${matchedKnownAnswer ? "true" : "false"};`,
    "const resultSource = matchedKnownAnswer ? 'seeded orders' : 'fallback stub';",
    "export { matchedKnownAnswer, question, resultSource };"
  ].join("\n");
}

function buildCommandLog(matchedKnownAnswer: boolean) {
  return [
    "[phase-01-stub] Received authenticated merchant question.",
    `[phase-01-stub] Matched known answer: ${
      matchedKnownAnswer ? "yes" : "no"
    }.`,
    "[phase-01-stub] Persisted result without external runtime execution."
  ].join("\n");
}

function toAnalysisRun(row: AnalysisRunRow): AnalysisRunResult {
  return {
    answer: parseJson(row.answerPayloadJson, validateAnswerPayload),
    attempts: Number(row.attempts),
    chart: parseJson(row.chartPayloadJson, validateChartPayload),
    commandLog: row.commandLog,
    completedAt: row.completedAt ? new Date(row.completedAt) : null,
    createdAt: new Date(row.createdAt),
    fallback: Boolean(row.fallback),
    generatedCode: row.generatedCode,
    id: row.id,
    merchantId: row.merchantId,
    question: row.question,
    runtimeMetadata: parseJson(
      row.runtimeMetadataJson,
      validateRuntimeMetadata
    ),
    updatedAt: new Date(row.updatedAt),
    userId: row.userId
  };
}

function assertAnalysisRunRow(row: unknown) {
  if (!isAnalysisRunRow(row)) {
    throw new Error("Persisted analysis row has an invalid shape.");
  }

  return row;
}

function parseJson<T>(json: string, validate: (value: unknown) => T): T {
  try {
    return validate(JSON.parse(json));
  } catch (error) {
    console.error("Failed to parse persisted analysis payload.", error);
    throw new Error("Persisted analysis payload is invalid.");
  }
}

function normalizeQuestion(question: string) {
  return question.trim().replace(/\s+/g, " ");
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(cents / 100);
}

function isAnalysisRunRow(row: unknown): row is AnalysisRunRow {
  return (
    isRecord(row) &&
    typeof row.answerPayloadJson === "string" &&
    isSqlInteger(row.attempts) &&
    typeof row.chartPayloadJson === "string" &&
    typeof row.commandLog === "string" &&
    (typeof row.completedAt === "string" || row.completedAt === null) &&
    typeof row.createdAt === "string" &&
    (isSqlInteger(row.fallback) || typeof row.fallback === "boolean") &&
    typeof row.generatedCode === "string" &&
    typeof row.id === "string" &&
    typeof row.merchantId === "string" &&
    typeof row.question === "string" &&
    typeof row.runtimeMetadataJson === "string" &&
    typeof row.updatedAt === "string" &&
    (typeof row.userId === "string" || row.userId === null)
  );
}

function isSqlInteger(value: unknown) {
  return typeof value === "number" || typeof value === "bigint";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
