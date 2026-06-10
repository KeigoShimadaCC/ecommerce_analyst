import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AnalysisChartPanel,
  AnalysisHistoryList,
  AnalysisResultView
} from "../../components/AnalysisViews";
import type { AuthenticatedSession } from "../auth";
import { MAY_2026_REVENUE_BY_REGION_QUERY } from "../analytics/knownAnswer";
import {
  createStubAnalysisRunForSession,
  getAnalysisRunByIdForSession,
  listAnalysisRunsForSession,
  persistAnalysisEngineResultForSession
} from "./runs";
import { buildAnalysisProofArtifactForSession } from "./proof-artifact";
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

  it("persists engine output with code and structured command-log history", () => {
    const run = persistAnalysisEngineResultForSession(
      database,
      buildSession("merchant-aurora"),
      "Show revenue by region",
      {
        answer: "West led revenue with $2,366.",
        attempts: 1,
        chart: {
          data: [{ label: "West", value: 236640 }],
          type: "bar"
        },
        commandLog: [
          {
            command: "node analysis.mjs",
            exitCode: 0,
            output: "Wrote result.json",
            status: "completed"
          }
        ],
        durationMs: 250,
        fallback: false,
        generatedCode: "console.log('analysis.mjs');",
        table: {
          columns: ["Region", "Revenue Cents"],
          rows: [["West", 236640]]
        }
      }
    );

    expect(run.chart.unit).toBe("currency_cents");
    expect(run.chart.data).toEqual([{ label: "West", value: 236640 }]);
    expect(run.runtimeMetadata.mode).toBe("codex-engine");
    expect(run.generatedCode).toContain("analysis.mjs");
    expect(JSON.parse(run.commandLog)).toEqual([
      {
        command: "node analysis.mjs",
        exitCode: 0,
        output: "Wrote result.json",
        status: "completed"
      }
    ]);

    const persisted = getAnalysisRunByIdForSession(
      database,
      buildSession("merchant-aurora"),
      run.id
    );

    expect(persisted?.runtimeMetadata.mode).toBe("codex-engine");
    expect(persisted?.commandLog).toContain("node analysis.mjs");

    render(<AnalysisResultView run={persisted ?? run} />);

    expect(
      screen.getByText("West led revenue with $2,366.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("$2,366").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/analysis\.mjs/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/node analysis\.mjs/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wrote result\.json/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Proof JSON" })).toHaveAttribute(
      "href",
      `/analyses/${run.id}/proof`
    );
  });

  it("builds a proof artifact with regenerated merchant snapshot contents", async () => {
    const run = createStubAnalysisRunForSession(
      database,
      buildSession("merchant-aurora"),
      MAY_2026_REVENUE_BY_REGION_QUERY
    );
    const tempRoot = mkdtempSync(join(tmpdir(), "ecommerce-proof-test-"));

    try {
      const artifact = await buildAnalysisProofArtifactForSession(
        database,
        buildSession("merchant-aurora"),
        run.id,
        {
          generatedAt: new Date("2026-06-10T12:00:00.000Z"),
          tempRoot
        }
      );

      expect(artifact).toEqual(
        expect.objectContaining({
          analysisId: run.id,
          answer: run.answer,
          attempts: 1,
          chart: run.chart,
          commandLog: run.commandLog,
          fallback: false,
          generatedAt: "2026-06-10T12:00:00.000Z",
          generatedCode: run.generatedCode,
          question: MAY_2026_REVENUE_BY_REGION_QUERY,
          runtimeMetadata: run.runtimeMetadata
        })
      );
      expect(artifact?.dataSnapshot.metadata).toEqual({
        merchantId: "merchant-aurora",
        note:
          "Snapshot files were regenerated at proof-download time from the current authenticated merchant database rows; this is not the original runtime SDK temporary directory.",
        regeneratedAt: "2026-06-10T12:00:00.000Z",
        source: "download_time_regeneration"
      });
      expect(artifact?.dataSnapshot.manifest).toHaveLength(6);
      expect(artifact?.dataSnapshot.contents["data.csv"]).toContain(
        "order-west"
      );
      expect(artifact?.dataSnapshot.contents["data.csv"]).not.toContain(
        "order-harbor-west"
      );
      expect(
        JSON.parse(artifact?.dataSnapshot.contents["data.json"] ?? "{}")
      ).toEqual(
        expect.objectContaining({
          merchantId: "merchant-aurora",
          rows: expect.arrayContaining([
            expect.objectContaining({
              orderId: "order-west",
              region: "West"
            })
          ])
        })
      );
      expect(readdirSync(tempRoot)).toEqual([]);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("does not build a proof artifact for a cross-merchant analysis", async () => {
    const run = createStubAnalysisRunForSession(
      database,
      buildSession("merchant-aurora"),
      MAY_2026_REVENUE_BY_REGION_QUERY
    );
    const tempRoot = mkdtempSync(join(tmpdir(), "ecommerce-proof-test-"));

    try {
      await expect(
        buildAnalysisProofArtifactForSession(
          database,
          buildSession("merchant-harbor"),
          run.id,
          { tempRoot }
        )
      ).resolves.toBeNull();
      expect(readdirSync(tempRoot)).toEqual([]);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("normalizes dollar-scale engine revenue charts to cents before rendering", () => {
    const run = persistAnalysisEngineResultForSession(
      database,
      buildSession("merchant-aurora"),
      [
        "In May 2026, chart paid revenue by region and tell me which region",
        "deserves next month's focus."
      ].join(" "),
      {
        answer:
          "West led May 2026 paid revenue with $2,366.40 and deserves next month's focus.",
        attempts: 1,
        chart: {
          data: [
            { label: "Midwest", value: 2352 },
            { label: "West", value: 2366.4 }
          ],
          type: "bar"
        },
        commandLog: [
          {
            command: "node analysis.mjs",
            exitCode: 0,
            output: "Wrote result.json",
            status: "completed"
          }
        ],
        durationMs: 250,
        fallback: false,
        generatedCode: "console.log('analysis.mjs');",
        table: {
          columns: ["Region", "Revenue ($)"],
          rows: [
            ["Midwest", 2352],
            ["West", 2366.4]
          ]
        }
      }
    );

    expect(run.chart.unit).toBe("currency_cents");
    expect(run.chart.data).toEqual([
      { label: "Midwest", value: 235200 },
      { label: "West", value: 236640 }
    ]);

    const persisted = getAnalysisRunByIdForSession(
      database,
      buildSession("merchant-aurora"),
      run.id
    );

    render(<AnalysisResultView run={persisted ?? run} />);

    expect(screen.getAllByText("$2,366").length).toBeGreaterThan(0);
    expect(screen.queryByText("$24")).not.toBeInTheDocument();
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

    const row = screen.getByRole("listitem", { name: /West/ });
    expect(within(row).getByText("$0")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders the May 2026 region chart as readable horizontal bars", () => {
    render(
      <AnalysisChartPanel
        chart={{
          data: [
            { label: "West", value: 236640 },
            { label: "Midwest", value: 235200 },
            { label: "Northeast", value: 183840 },
            { label: "South", value: 161280 }
          ],
          title: "May 2026 revenue by region",
          type: "bar",
          unit: "currency_cents",
          xLabel: "Region",
          yLabel: "Revenue"
        }}
      />
    );

    for (const [region, value] of [
      ["West", "$2,366"],
      ["Midwest", "$2,352"],
      ["Northeast", "$1,838"],
      ["South", "$1,613"]
    ]) {
      const row = screen.getByRole("listitem", { name: `${region} ${value}` });

      expect(row).toHaveClass("analysis-bar-row");
      expect(within(row).getByText(region)).toBeInTheDocument();
      expect(within(row).getByText(value)).toBeInTheDocument();
    }
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
      "orderNumber" TEXT NOT NULL,
      "merchantId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "regionId" TEXT NOT NULL,
      "orderedAt" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "totalRevenueCents" INTEGER NOT NULL,
      "totalCostCents" INTEGER NOT NULL
    );

    CREATE TABLE "Product" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL
    );

    CREATE TABLE "Customer" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL
    );

    CREATE TABLE "OrderLine" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitPriceCents" INTEGER NOT NULL,
      "unitCostCents" INTEGER NOT NULL,
      "lineRevenueCents" INTEGER NOT NULL,
      "lineCostCents" INTEGER NOT NULL
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
      "orderNumber",
      "merchantId",
      "customerId",
      "regionId",
      "orderedAt",
      "status",
      "totalRevenueCents",
      "totalCostCents"
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProduct = database.prepare(`
    INSERT INTO "Product" (
      "id",
      "merchantId",
      "sku",
      "name",
      "category"
    )
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertCustomer = database.prepare(`
    INSERT INTO "Customer" (
      "id",
      "merchantId",
      "name",
      "email"
    )
    VALUES (?, ?, ?, ?)
  `);
  const insertOrderLine = database.prepare(`
    INSERT INTO "OrderLine" (
      "id",
      "orderId",
      "productId",
      "quantity",
      "unitPriceCents",
      "unitCostCents",
      "lineRevenueCents",
      "lineCostCents"
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const regionRows = [
    ["region-midwest", "Midwest"],
    ["region-northeast", "Northeast"],
    ["region-south", "South"],
    ["region-west", "West"]
  ];
  const orderRows: Array<[string, string, number]> = [
    ["order-midwest", "region-midwest", 235200],
    ["order-northeast", "region-northeast", 183840],
    ["order-south", "region-south", 161280],
    ["order-west", "region-west", 236640]
  ];

  for (const [id, name] of regionRows) {
    insertRegion.run(id, name);
  }

  insertProduct.run(
    "product-aurora",
    "merchant-aurora",
    "AUR-TEE",
    "Aurora Tee",
    "Apparel"
  );
  insertProduct.run(
    "product-harbor",
    "merchant-harbor",
    "HAR-TOTE",
    "Harbor Tote",
    "Accessories"
  );
  insertCustomer.run(
    "customer-aurora",
    "merchant-aurora",
    "Aurora Buyer",
    "aurora-buyer@example.test"
  );
  insertCustomer.run(
    "customer-harbor",
    "merchant-harbor",
    "Harbor Buyer",
    "harbor-buyer@example.test"
  );

  for (const [id, regionId, revenueCents] of orderRows) {
    const costCents = Number(revenueCents) / 2;

    insertOrder.run(
      id,
      id.toUpperCase(),
      "merchant-aurora",
      "customer-aurora",
      regionId,
      "2026-05-15T12:00:00.000Z",
      "paid",
      revenueCents,
      costCents
    );
    insertOrderLine.run(
      `line-${id}`,
      id,
      "product-aurora",
      1,
      revenueCents,
      costCents,
      revenueCents,
      costCents
    );
  }

  insertOrder.run(
    "order-harbor-west",
    "ORDER-HARBOR-WEST",
    "merchant-harbor",
    "customer-harbor",
    "region-west",
    "2026-05-15T12:00:00.000Z",
    "paid",
    999999,
    400000
  );
  insertOrderLine.run(
    "line-order-harbor-west",
    "order-harbor-west",
    "product-harbor",
    1,
    999999,
    400000,
    999999,
    400000
  );
}
