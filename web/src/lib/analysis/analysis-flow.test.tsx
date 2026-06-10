import { DatabaseSync } from "node:sqlite";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AnalysisChartPanel,
  AnalysisHistoryList,
  AnalysisResultView
} from "../../components/AnalysisViews";
import type { AuthenticatedSession } from "../auth";
import {
  MAY_2026_REVENUE_BY_REGION_QUERY
} from "../analytics/knownAnswer";
import {
  createStubAnalysisRunForSession,
  getAnalysisRunByIdForSession,
  listAnalysisRunsForSession
} from "./runs";
import type { AnalysisRunResult } from "./result";

describe.sequential("analysis stub flow", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    createKnownAnswerTables(database);
    createAnalysisRunTable(database);
    seedKnownAnswerOrders(database);
  });

  afterEach(() => {
    database.close();
  });

  it("persists the exact known-answer payload for the authenticated merchant", () => {
    const run = createStubAnalysisRunForSession(
      database,
      buildSession("merchant-aurora"),
      MAY_2026_REVENUE_BY_REGION_QUERY
    );

    expect(run.merchantId).toBe("merchant-aurora");
    expect(run.userId).toBe("user-merchant-aurora");
    expect(run.fallback).toBe(false);
    expect(run.attempts).toBe(1);
    expect(run.generatedCode.length).toBeGreaterThan(0);
    expect(run.commandLog.length).toBeGreaterThan(0);
    expect(run.answer.answer).toBe(
      "West led May 2026 revenue at $2,366. Focus next month on West, the highest-revenue region for May 2026."
    );
    expect(run.answer.recommendation).toBe(
      "Focus next month on West, the highest-revenue region for May 2026."
    );
    expect(run.chart).toEqual({
      data: [
        { label: "Midwest", value: 235200 },
        { label: "Northeast", value: 183840 },
        { label: "South", value: 161280 },
        { label: "West", value: 236640 }
      ],
      title: "May 2026 revenue by region",
      type: "bar",
      unit: "currency_cents",
      xLabel: "Region",
      yLabel: "Revenue"
    });

    const persisted = getAnalysisRunByIdForSession(
      database,
      buildSession("merchant-aurora"),
      run.id
    );

    expect(persisted?.chart).toEqual(run.chart);
    expect(persisted?.generatedCode.length).toBeGreaterThan(0);
    expect(persisted?.commandLog.length).toBeGreaterThan(0);
  });

  it("lists only the authenticated merchant's analyses", () => {
    const auroraRun = createStubAnalysisRunForSession(
      database,
      buildSession("merchant-aurora"),
      MAY_2026_REVENUE_BY_REGION_QUERY
    );
    createStubAnalysisRunForSession(
      database,
      buildSession("merchant-harbor"),
      "Which products need attention?"
    );

    const history = listAnalysisRunsForSession(
      database,
      buildSession("merchant-aurora")
    );

    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe(auroraRun.id);
    expect(history[0]?.question).toBe(MAY_2026_REVENUE_BY_REGION_QUERY);
  });

  it("rejects cross-merchant saved result access", () => {
    const auroraRun = createStubAnalysisRunForSession(
      database,
      buildSession("merchant-aurora"),
      MAY_2026_REVENUE_BY_REGION_QUERY
    );

    expect(
      getAnalysisRunByIdForSession(
        database,
        buildSession("merchant-harbor"),
        auroraRun.id
      )
    ).toBeNull();
  });

  it("renders empty result and history states without leaking a literal zero", () => {
    const { container: resultContainer } = render(
      <AnalysisResultView run={buildRenderableRun()} />
    );

    expect(screen.getByText("No chart data is available.")).toBeInTheDocument();
    expect(resultContainer).not.toHaveTextContent(/\b0\b/);

    const { container: historyContainer } = render(
      <AnalysisHistoryList runs={[]} />
    );

    expect(screen.getByText("No saved analyses yet.")).toBeInTheDocument();
    expect(historyContainer).not.toHaveTextContent(/\b0\b/);
  });

  it("renders zero-value chart rows as currency without an extra bare zero", () => {
    render(
      <AnalysisChartPanel
        chart={{
          data: [{ label: "West", value: 0 }],
          title: "Zero revenue chart",
          type: "bar",
          unit: "currency_cents",
          xLabel: "Region",
          yLabel: "Revenue"
        }}
      />
    );

    const row = screen.getByRole("row", { name: /West/ });
    expect(within(row).getByText("$0")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

function buildSession(merchantId: string): AuthenticatedSession {
  return {
    email: `${merchantId}@example.test`,
    expiresAt: new Date("2026-06-11T00:00:00.000Z"),
    merchantId,
    merchantName: merchantId,
    merchantSlug: merchantId,
    name: `${merchantId} Owner`,
    role: "owner",
    sessionId: `session-${merchantId}`,
    userId: `user-${merchantId}`
  };
}

function buildRenderableRun(): AnalysisRunResult {
  const timestamp = new Date("2026-06-10T12:00:00.000Z");

  return {
    answer: {
      answer: "No deterministic chart is available.",
      fallback: true,
      highlights: [],
      notes: [],
      recommendation: "Ask the May revenue by region question."
    },
    attempts: 1,
    chart: {
      data: [],
      title: "No deterministic chart available",
      type: "bar",
      unit: "currency_cents",
      xLabel: "Region",
      yLabel: "Revenue"
    },
    commandLog: "[phase-01-stub] Placeholder command log.",
    completedAt: timestamp,
    createdAt: timestamp,
    fallback: true,
    generatedCode: "// Placeholder generated code.",
    id: "analysis-renderable",
    merchantId: "merchant-aurora",
    question: "Which products need attention?",
    runtimeMetadata: {
      completedAt: timestamp.toISOString(),
      durationMs: 1,
      matchedKnownAnswer: false,
      mode: "deterministic-stub"
    },
    updatedAt: timestamp,
    userId: "user-merchant-aurora"
  };
}

function createKnownAnswerTables(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE "Region" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL
    );

    CREATE TABLE "Order" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "regionId" TEXT NOT NULL,
      "orderedAt" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "totalRevenueCents" INTEGER NOT NULL
    );
  `);
}

function createAnalysisRunTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE "AnalysisRun" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "userId" TEXT,
      "question" TEXT NOT NULL,
      "answerPayloadJson" TEXT NOT NULL,
      "chartPayloadJson" TEXT NOT NULL,
      "generatedCode" TEXT NOT NULL,
      "commandLog" TEXT NOT NULL,
      "runtimeMetadataJson" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL,
      "fallback" INTEGER NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      "completedAt" TEXT
    );
  `);
}

function seedKnownAnswerOrders(database: DatabaseSync) {
  const insertRegion = database.prepare(
    'INSERT INTO "Region" ("id", "name") VALUES (?, ?)'
  );
  const insertOrder = database.prepare(`
    INSERT INTO "Order" (
      "id",
      "merchantId",
      "regionId",
      "orderedAt",
      "status",
      "totalRevenueCents"
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const regionRows = [
    ["region-midwest", "Midwest"],
    ["region-northeast", "Northeast"],
    ["region-south", "South"],
    ["region-west", "West"]
  ];
  const orderRows = [
    ["order-midwest", "region-midwest", 235200],
    ["order-northeast", "region-northeast", 183840],
    ["order-south", "region-south", 161280],
    ["order-west", "region-west", 236640]
  ];

  for (const [id, name] of regionRows) {
    insertRegion.run(id, name);
  }

  for (const [id, regionId, revenueCents] of orderRows) {
    insertOrder.run(
      id,
      "merchant-aurora",
      regionId,
      "2026-05-15T12:00:00.000Z",
      "paid",
      revenueCents
    );
  }

  insertOrder.run(
    "order-harbor-west",
    "merchant-harbor",
    "region-west",
    "2026-05-15T12:00:00.000Z",
    "paid",
    999999
  );
}
