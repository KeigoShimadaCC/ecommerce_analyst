import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getDashboardDataForSession,
  type DashboardSession
} from "./data";

describe.sequential("dashboard data helpers", () => {
  let database: DatabaseSync;
  const auroraSession = {
    merchantId: "merchant-aurora",
    merchantName: "Aurora Outfitters",
    merchantSlug: "aurora",
    name: "Aurora Outfitters Owner"
  } satisfies DashboardSession;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    createOrderTable(database);
    seedDashboardOrders(database);
  });

  afterEach(() => {
    database.close();
  });

  it("computes KPI and trend values from seeded orders for the authenticated merchant", () => {
    const data = getDashboardDataForSession(database, auroraSession);

    expect(data.merchantId).toBe("merchant-aurora");
    expect(data.merchantName).toBe("Aurora Outfitters");
    expect(data.periodLabel).toBe("Jan 2026 - Jun 2026");
    expect(data.monthlyRevenue).toHaveLength(6);
    expect(data.monthlyRevenue.map((point) => point.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06"
    ]);
    expect(data.monthlyRevenue.find((point) => point.month === "2026-05")).toMatchObject({
      marginCents: 366960,
      orderCount: 1,
      revenueCents: 816960
    });
    expect(data.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mayRevenue",
          value: "$8,170"
        }),
        expect.objectContaining({
          id: "orderCount",
          value: "6"
        })
      ])
    );
  });

  it("takes tenant identity from the authenticated session shape, not request input", () => {
    const requestInput = {
      merchantId: "merchant-harbor",
      session: auroraSession
    };

    const data = getDashboardDataForSession(database, requestInput.session);

    expect(data.merchantId).toBe(auroraSession.merchantId);
    expect(data.merchantId).not.toBe(requestInput.merchantId);
  });

  it("does not type-check request-shaped tenant input as a dashboard session", () => {
    if (false) {
      // @ts-expect-error Dashboard helpers require authenticated session context.
      getDashboardDataForSession(database, { merchantId: "merchant-harbor" });
    }

    expect(getDashboardDataForSession.length).toBe(2);
  });
});

function createOrderTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE "Order" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "orderedAt" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "totalRevenueCents" INTEGER NOT NULL,
      "totalCostCents" INTEGER NOT NULL
    );
  `);
}

function seedDashboardOrders(database: DatabaseSync) {
  const insertOrder = database.prepare(`
    INSERT INTO "Order" (
      "id",
      "merchantId",
      "orderedAt",
      "status",
      "totalRevenueCents",
      "totalCostCents"
    )
    VALUES (?, ?, ?, 'paid', ?, ?)
  `);
  const auroraRows = [
    ["2026-01", 601200, 270000],
    ["2026-02", 642500, 289000],
    ["2026-03", 705000, 315000],
    ["2026-04", 731400, 329000],
    ["2026-05", 816960, 450000],
    ["2026-06", 748880, 336000]
  ];

  auroraRows.forEach(([month, revenueCents, costCents], index) => {
    insertOrder.run(
      `order-aurora-${month}`,
      "merchant-aurora",
      `${month}-15T12:00:00.000Z`,
      revenueCents,
      costCents
    );

    if (index === 0) {
      insertOrder.run(
        "order-aurora-refunded",
        "merchant-aurora",
        "2026-01-18T12:00:00.000Z",
        999999,
        1
      );
      database
        .prepare('UPDATE "Order" SET "status" = ? WHERE "id" = ?')
        .run("refunded", "order-aurora-refunded");
    }
  });

  insertOrder.run(
    "order-harbor-later",
    "merchant-harbor",
    "2026-12-15T12:00:00.000Z",
    999999,
    1
  );
}
