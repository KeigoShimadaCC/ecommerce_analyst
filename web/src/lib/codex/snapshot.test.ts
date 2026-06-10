import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupMerchantSnapshot,
  createMerchantSnapshot,
  SNAPSHOT_FILE_NAMES,
  type MerchantSnapshot
} from "./snapshot";

describe.sequential("merchant snapshot writer", () => {
  let database: DatabaseSync;
  let tempRoot: string;
  let snapshots: MerchantSnapshot[];

  beforeEach(async () => {
    database = new DatabaseSync(":memory:");
    tempRoot = await mkdtemp(join(tmpdir(), "snapshot-test-"));
    snapshots = [];
    createSnapshotTables(database);
    seedSnapshotRows(database);
  });

  afterEach(async () => {
    for (const snapshot of snapshots) {
      await snapshot.cleanup();
    }

    database.close();
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("writes exactly the expected file set", async () => {
    const snapshot = await createTestSnapshot();

    expect((await readdir(snapshot.directory)).sort()).toEqual(
      [...SNAPSHOT_FILE_NAMES].sort()
    );
    expect(Object.keys(snapshot.files).sort()).toEqual(
      [...SNAPSHOT_FILE_NAMES].sort()
    );
  });

  it("includes only the authenticated merchant's rows", async () => {
    const snapshot = await createTestSnapshot();
    const dataJson = JSON.parse(await readFileText(snapshot.files["data.json"]));
    const dataCsv = await readFileText(snapshot.files["data.csv"]);

    expect(dataJson.merchantId).toBe("merchant-aurora");
    expect(dataJson.rows).toHaveLength(4);
    expect(dataJson.rows.map((row: { orderId: string }) => row.orderId)).toEqual(
      [
        "order-aurora-jan-west",
        "order-aurora-may-west",
        "order-aurora-may-east",
        "order-aurora-refunded"
      ]
    );
    expect(dataCsv).toContain("order-aurora-may-west");
    expect(dataCsv).not.toContain("order-harbor-may-east");
    expect(dataCsv).not.toContain("harbor@example.com");
  });

  it("computes merchant-scoped paid revenue summaries", async () => {
    const snapshot = await createTestSnapshot();

    expect(await readFileText(snapshot.files["monthly_revenue.csv"])).toBe(
      [
        "month,revenueCents,orderCount",
        "2026-01,10000,1",
        "2026-05,45000,2",
        ""
      ].join("\n")
    );
    expect(await readFileText(snapshot.files["revenue_by_region.csv"])).toBe(
      [
        "period,region,revenueCents,orderCount",
        "2026-01,West,10000,1",
        "2026-05,East,15000,1",
        "2026-05,West,30000,1",
        ""
      ].join("\n")
    );
    expect(await readFileText(snapshot.files["revenue_by_category.csv"])).toBe(
      [
        "period,category,revenueCents,quantity",
        "2026-01,Apparel,10000,2",
        "2026-05,Apparel,30000,3",
        "2026-05,Gear,15000,1",
        ""
      ].join("\n")
    );
  });

  it("removes snapshot directories through the direct cleanup helper", async () => {
    const directory = await mkdtemp(join(tempRoot, "manual-cleanup-"));
    await writeFile(join(directory, "artifact.txt"), "temporary\n");

    await cleanupMerchantSnapshot(directory);

    await expect(stat(directory)).rejects.toMatchObject({ code: "ENOENT" });
  });

  async function createTestSnapshot() {
    const snapshot = await createMerchantSnapshot({
      database,
      merchantId: "merchant-aurora",
      tempRoot
    });
    snapshots.push(snapshot);
    return snapshot;
  }
});

async function readFileText(path: string) {
  return readFile(path, "utf8");
}

function createSnapshotTables(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE "Region" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL
    );

    CREATE TABLE "Product" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "priceCents" INTEGER NOT NULL,
      "unitCostCents" INTEGER NOT NULL
    );

    CREATE TABLE "Customer" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "regionId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT NOT NULL
    );

    CREATE TABLE "Order" (
      "id" TEXT PRIMARY KEY,
      "merchantId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "regionId" TEXT NOT NULL,
      "orderNumber" TEXT NOT NULL,
      "orderedAt" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "totalRevenueCents" INTEGER NOT NULL,
      "totalCostCents" INTEGER NOT NULL
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

function seedSnapshotRows(database: DatabaseSync) {
  const insertRegion = database.prepare(
    'INSERT INTO "Region" ("id", "name") VALUES (?, ?)'
  );
  const insertProduct = database.prepare(`
    INSERT INTO "Product" (
      "id",
      "merchantId",
      "sku",
      "name",
      "category",
      "priceCents",
      "unitCostCents"
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCustomer = database.prepare(`
    INSERT INTO "Customer" (
      "id",
      "merchantId",
      "regionId",
      "email",
      "name"
    )
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertOrder = database.prepare(`
    INSERT INTO "Order" (
      "id",
      "merchantId",
      "customerId",
      "regionId",
      "orderNumber",
      "orderedAt",
      "status",
      "totalRevenueCents",
      "totalCostCents"
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLine = database.prepare(`
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

  insertRegion.run("region-west", "West");
  insertRegion.run("region-east", "East");
  insertRegion.run("region-south", "South");

  insertProduct.run(
    "product-aurora-apparel",
    "merchant-aurora",
    "AUR-COAT",
    "Trail Coat",
    "Apparel",
    5000,
    2100
  );
  insertProduct.run(
    "product-aurora-gear",
    "merchant-aurora",
    "AUR-PACK",
    "Day Pack",
    "Gear",
    15000,
    7000
  );
  insertProduct.run(
    "product-harbor-apparel",
    "merchant-harbor",
    "HAR-TEE",
    "Harbor Tee",
    "Apparel",
    999999,
    1
  );

  insertCustomer.run(
    "customer-aurora-west",
    "merchant-aurora",
    "region-west",
    "west@example.com",
    "West Customer"
  );
  insertCustomer.run(
    "customer-aurora-east",
    "merchant-aurora",
    "region-east",
    "east@example.com",
    "East Customer"
  );
  insertCustomer.run(
    "customer-harbor-east",
    "merchant-harbor",
    "region-east",
    "harbor@example.com",
    "Harbor Customer"
  );

  insertOrder.run(
    "order-aurora-jan-west",
    "merchant-aurora",
    "customer-aurora-west",
    "region-west",
    "A-1001",
    "2026-01-15T12:00:00.000Z",
    "paid",
    10000,
    4200
  );
  insertLine.run(
    "line-aurora-jan-west",
    "order-aurora-jan-west",
    "product-aurora-apparel",
    2,
    5000,
    2100,
    10000,
    4200
  );

  insertOrder.run(
    "order-aurora-may-west",
    "merchant-aurora",
    "customer-aurora-west",
    "region-west",
    "A-1002",
    "2026-05-08T12:00:00.000Z",
    "paid",
    30000,
    12600
  );
  insertLine.run(
    "line-aurora-may-west",
    "order-aurora-may-west",
    "product-aurora-apparel",
    3,
    10000,
    4200,
    30000,
    12600
  );

  insertOrder.run(
    "order-aurora-may-east",
    "merchant-aurora",
    "customer-aurora-east",
    "region-east",
    "A-1003",
    "2026-05-18T12:00:00.000Z",
    "paid",
    15000,
    7000
  );
  insertLine.run(
    "line-aurora-may-east",
    "order-aurora-may-east",
    "product-aurora-gear",
    1,
    15000,
    7000,
    15000,
    7000
  );

  insertOrder.run(
    "order-aurora-refunded",
    "merchant-aurora",
    "customer-aurora-west",
    "region-south",
    "A-1004",
    "2026-05-25T12:00:00.000Z",
    "refunded",
    999999,
    1
  );
  insertLine.run(
    "line-aurora-refunded",
    "order-aurora-refunded",
    "product-aurora-apparel",
    99,
    9999,
    1,
    999999,
    1
  );

  insertOrder.run(
    "order-harbor-may-east",
    "merchant-harbor",
    "customer-harbor-east",
    "region-east",
    "H-1001",
    "2026-05-10T12:00:00.000Z",
    "paid",
    999999,
    1
  );
  insertLine.run(
    "line-harbor-may-east",
    "order-harbor-may-east",
    "product-harbor-apparel",
    1,
    999999,
    1,
    999999,
    1
  );
}
