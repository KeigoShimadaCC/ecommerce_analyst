import { DatabaseSync } from "node:sqlite";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DATABASE_URL } from "../config/database";
import {
  getMay2026RevenueByRegion,
  MAY_2026_REVENUE_BY_REGION_QUERY
} from "../analytics/knownAnswer";
import { seedDatabase } from "./seed.mjs";

describe.sequential("deterministic seed data", () => {
  const schemaDatabasePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../test.db"
  );
  let database: DatabaseSync;
  let tempDatabaseDir: string;

  beforeAll(() => {
    expect(process.env.DATABASE_URL).toBe(TEST_DATABASE_URL);
    tempDatabaseDir = mkdtempSync(resolve(tmpdir(), "ecommerce-seed-test-"));
    const tempDatabasePath = resolve(tempDatabaseDir, "seed.db");
    copyFileSync(schemaDatabasePath, tempDatabasePath);
    database = new DatabaseSync(tempDatabasePath);
    seedDatabase(database);
  });

  afterAll(() => {
    database.close();
    rmSync(tempDatabaseDir, { force: true, recursive: true });
  });

  it("creates the Phase 01 demo cardinalities", () => {
    const merchants = database
      .prepare(
        `
          SELECT "Merchant"."id",
                 COUNT(DISTINCT "Product"."id") AS products,
                 COUNT(DISTINCT "Customer"."id") AS customers,
                 COUNT(DISTINCT "Order"."id") AS orders
          FROM "Merchant"
          LEFT JOIN "Product" ON "Product"."merchantId" = "Merchant"."id"
          LEFT JOIN "Customer" ON "Customer"."merchantId" = "Merchant"."id"
          LEFT JOIN "Order" ON "Order"."merchantId" = "Merchant"."id"
          GROUP BY "Merchant"."id"
          ORDER BY "Merchant"."id" ASC
        `
      )
      .all();
    const categoriesByMerchant = database
      .prepare(
        `
          SELECT "merchantId", COUNT(DISTINCT "category") AS categories
          FROM "Product"
          GROUP BY "merchantId"
        `
      )
      .all();

    expect(merchants).toHaveLength(2);
    expect(countRows("Region")).toBe(4);
    expect(countRows("Customer")).toBe(120);
    expect(countRows("Order")).toBe(3240);
    expect(countRows("OrderLine")).toBeGreaterThan(4800);

    for (const merchant of merchants) {
      expect(Number(merchant.products)).toBeGreaterThanOrEqual(10);
      expect(Number(merchant.customers)).toBe(60);
      expect(Number(merchant.orders)).toBeGreaterThanOrEqual(1500);
    }

    for (const merchantCategories of categoriesByMerchant) {
      expect(Number(merchantCategories.categories)).toBeGreaterThanOrEqual(3);
    }

    const productsWithoutCosts = Number(
      database
        .prepare(
          'SELECT COUNT(*) AS count FROM "Product" WHERE "unitCostCents" <= 0'
        )
        .get()?.count ?? 0
    );
    expect(productsWithoutCosts).toBe(0);
  });

  it("computes the exact known answer for May 2026 revenue by region", () => {
    const answer = getMay2026RevenueByRegion(database, "merchant-aurora");

    expect(answer.question).toBe(MAY_2026_REVENUE_BY_REGION_QUERY);
    expect(answer.chart.bars).toEqual([
      { region: "Midwest", revenueCents: 235200 },
      { region: "Northeast", revenueCents: 183840 },
      { region: "South", revenueCents: 161280 },
      { region: "West", revenueCents: 236640 }
    ]);
    expect(answer.leadingRegion).toBe("West");
    expect(answer.recommendation).toBe(
      "Focus next month on West, the highest-revenue region for May 2026."
    );
  });

  function countRows(tableName: string) {
    return Number(
      database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}"`).get()
        ?.count ?? 0
    );
  }
});
