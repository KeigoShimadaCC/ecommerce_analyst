import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SNAPSHOT_FILE_NAMES = [
  "data.json",
  "data.csv",
  "monthly_revenue.csv",
  "revenue_by_region.csv",
  "revenue_by_category.csv",
  "data_dictionary.md"
] as const;

export type SnapshotFileName = (typeof SNAPSHOT_FILE_NAMES)[number];

export type SqliteSnapshotReader = {
  prepare(sql: string): {
    all(...values: unknown[]): Array<Record<string, unknown>>;
  };
};

export type CreateMerchantSnapshotOptions = {
  database: SqliteSnapshotReader;
  merchantId: string;
  tempRoot?: string;
};

export type MerchantSnapshot = {
  cleanup: () => Promise<void>;
  directory: string;
  files: Record<SnapshotFileName, string>;
};

type DataRow = {
  category: string;
  customerEmail: string;
  customerId: string;
  customerName: string;
  lineCostCents: number;
  lineId: string;
  lineRevenueCents: number;
  orderCostCents: number;
  orderedAt: string;
  orderId: string;
  orderNumber: string;
  orderRevenueCents: number;
  productId: string;
  productName: string;
  quantity: number;
  region: string;
  sku: string;
  status: string;
  unitCostCents: number;
  unitPriceCents: number;
};

type MonthlyRevenueRow = {
  month: string;
  orderCount: number;
  revenueCents: number;
};

type RevenueByRegionRow = {
  orderCount: number;
  period: string;
  region: string;
  revenueCents: number;
};

type RevenueByCategoryRow = {
  category: string;
  period: string;
  quantity: number;
  revenueCents: number;
};

export async function createMerchantSnapshot({
  database,
  merchantId,
  tempRoot = tmpdir()
}: CreateMerchantSnapshotOptions): Promise<MerchantSnapshot> {
  const directory = await mkdtemp(join(tempRoot, "ecommerce-snapshot-"));
  const files = Object.fromEntries(
    SNAPSHOT_FILE_NAMES.map((fileName) => [fileName, join(directory, fileName)])
  ) as Record<SnapshotFileName, string>;

  const rows = getDataRows(database, merchantId);
  const monthlyRevenue = getMonthlyRevenue(database, merchantId);
  const revenueByRegion = getRevenueByRegion(database, merchantId);
  const revenueByCategory = getRevenueByCategory(database, merchantId);

  await Promise.all([
    writeFile(
      files["data.json"],
      `${JSON.stringify(
        {
          merchantId,
          rows
        },
        null,
        2
      )}\n`
    ),
    writeFile(files["data.csv"], toCsv(DATA_COLUMNS, rows)),
    writeFile(
      files["monthly_revenue.csv"],
      toCsv(MONTHLY_REVENUE_COLUMNS, monthlyRevenue)
    ),
    writeFile(
      files["revenue_by_region.csv"],
      toCsv(REVENUE_BY_REGION_COLUMNS, revenueByRegion)
    ),
    writeFile(
      files["revenue_by_category.csv"],
      toCsv(REVENUE_BY_CATEGORY_COLUMNS, revenueByCategory)
    ),
    writeFile(files["data_dictionary.md"], DATA_DICTIONARY)
  ]);

  return {
    cleanup: () => cleanupMerchantSnapshot(directory),
    directory,
    files
  };
}

export async function cleanupMerchantSnapshot(directory: string) {
  await rm(directory, { force: true, recursive: true });
}

const DATA_COLUMNS = [
  "orderId",
  "orderNumber",
  "orderedAt",
  "status",
  "orderRevenueCents",
  "orderCostCents",
  "lineId",
  "quantity",
  "unitPriceCents",
  "unitCostCents",
  "lineRevenueCents",
  "lineCostCents",
  "productId",
  "sku",
  "productName",
  "category",
  "customerId",
  "customerName",
  "customerEmail",
  "region"
] as const satisfies ReadonlyArray<keyof DataRow>;

const MONTHLY_REVENUE_COLUMNS = [
  "month",
  "revenueCents",
  "orderCount"
] as const satisfies ReadonlyArray<keyof MonthlyRevenueRow>;

const REVENUE_BY_REGION_COLUMNS = [
  "period",
  "region",
  "revenueCents",
  "orderCount"
] as const satisfies ReadonlyArray<keyof RevenueByRegionRow>;

const REVENUE_BY_CATEGORY_COLUMNS = [
  "period",
  "category",
  "revenueCents",
  "quantity"
] as const satisfies ReadonlyArray<keyof RevenueByCategoryRow>;

function getDataRows(database: SqliteSnapshotReader, merchantId: string) {
  return database
    .prepare(
      `
        SELECT "Order"."id" AS orderId,
               "Order"."orderNumber" AS orderNumber,
               "Order"."orderedAt" AS orderedAt,
               "Order"."status" AS status,
               "Order"."totalRevenueCents" AS orderRevenueCents,
               "Order"."totalCostCents" AS orderCostCents,
               "OrderLine"."id" AS lineId,
               "OrderLine"."quantity" AS quantity,
               "OrderLine"."unitPriceCents" AS unitPriceCents,
               "OrderLine"."unitCostCents" AS unitCostCents,
               "OrderLine"."lineRevenueCents" AS lineRevenueCents,
               "OrderLine"."lineCostCents" AS lineCostCents,
               "Product"."id" AS productId,
               "Product"."sku" AS sku,
               "Product"."name" AS productName,
               "Product"."category" AS category,
               "Customer"."id" AS customerId,
               "Customer"."name" AS customerName,
               "Customer"."email" AS customerEmail,
               "Region"."name" AS region
        FROM "Order"
        INNER JOIN "OrderLine" ON "OrderLine"."orderId" = "Order"."id"
        INNER JOIN "Product" ON "Product"."id" = "OrderLine"."productId"
        INNER JOIN "Customer" ON "Customer"."id" = "Order"."customerId"
        INNER JOIN "Region" ON "Region"."id" = "Order"."regionId"
        WHERE "Order"."merchantId" = ?
          AND "Product"."merchantId" = ?
          AND "Customer"."merchantId" = ?
        ORDER BY "Order"."orderedAt" ASC,
                 "Order"."orderNumber" ASC,
                 "OrderLine"."id" ASC
      `
    )
    .all(merchantId, merchantId, merchantId)
    .map(toDataRow);
}

function getMonthlyRevenue(database: SqliteSnapshotReader, merchantId: string) {
  return database
    .prepare(
      `
        SELECT SUBSTR("Order"."orderedAt", 1, 7) AS month,
               SUM("Order"."totalRevenueCents") AS revenueCents,
               COUNT(*) AS orderCount
        FROM "Order"
        WHERE "Order"."merchantId" = ?
          AND "Order"."status" = 'paid'
        GROUP BY SUBSTR("Order"."orderedAt", 1, 7)
        ORDER BY month ASC
      `
    )
    .all(merchantId)
    .map(toMonthlyRevenueRow);
}

function getRevenueByRegion(database: SqliteSnapshotReader, merchantId: string) {
  return database
    .prepare(
      `
        SELECT SUBSTR("Order"."orderedAt", 1, 7) AS period,
               "Region"."name" AS region,
               SUM("Order"."totalRevenueCents") AS revenueCents,
               COUNT(*) AS orderCount
        FROM "Order"
        INNER JOIN "Region" ON "Region"."id" = "Order"."regionId"
        WHERE "Order"."merchantId" = ?
          AND "Order"."status" = 'paid'
        GROUP BY SUBSTR("Order"."orderedAt", 1, 7),
                 "Region"."name"
        ORDER BY period ASC,
                 "Region"."name" ASC
      `
    )
    .all(merchantId)
    .map(toRevenueByRegionRow);
}

function getRevenueByCategory(
  database: SqliteSnapshotReader,
  merchantId: string
) {
  return database
    .prepare(
      `
        SELECT SUBSTR("Order"."orderedAt", 1, 7) AS period,
               "Product"."category" AS category,
               SUM("OrderLine"."lineRevenueCents") AS revenueCents,
               SUM("OrderLine"."quantity") AS quantity
        FROM "OrderLine"
        INNER JOIN "Order" ON "Order"."id" = "OrderLine"."orderId"
        INNER JOIN "Product" ON "Product"."id" = "OrderLine"."productId"
        WHERE "Order"."merchantId" = ?
          AND "Product"."merchantId" = ?
          AND "Order"."status" = 'paid'
        GROUP BY SUBSTR("Order"."orderedAt", 1, 7),
                 "Product"."category"
        ORDER BY period ASC,
                 "Product"."category" ASC
      `
    )
    .all(merchantId, merchantId)
    .map(toRevenueByCategoryRow);
}

function toDataRow(row: Record<string, unknown>): DataRow {
  return {
    category: toStringValue(row.category),
    customerEmail: toStringValue(row.customerEmail),
    customerId: toStringValue(row.customerId),
    customerName: toStringValue(row.customerName),
    lineCostCents: toNumber(row.lineCostCents),
    lineId: toStringValue(row.lineId),
    lineRevenueCents: toNumber(row.lineRevenueCents),
    orderCostCents: toNumber(row.orderCostCents),
    orderedAt: toStringValue(row.orderedAt),
    orderId: toStringValue(row.orderId),
    orderNumber: toStringValue(row.orderNumber),
    orderRevenueCents: toNumber(row.orderRevenueCents),
    productId: toStringValue(row.productId),
    productName: toStringValue(row.productName),
    quantity: toNumber(row.quantity),
    region: toStringValue(row.region),
    sku: toStringValue(row.sku),
    status: toStringValue(row.status),
    unitCostCents: toNumber(row.unitCostCents),
    unitPriceCents: toNumber(row.unitPriceCents)
  };
}

function toMonthlyRevenueRow(
  row: Record<string, unknown>
): MonthlyRevenueRow {
  return {
    month: toStringValue(row.month),
    orderCount: toNumber(row.orderCount),
    revenueCents: toNumber(row.revenueCents)
  };
}

function toRevenueByRegionRow(
  row: Record<string, unknown>
): RevenueByRegionRow {
  return {
    orderCount: toNumber(row.orderCount),
    period: toStringValue(row.period),
    region: toStringValue(row.region),
    revenueCents: toNumber(row.revenueCents)
  };
}

function toRevenueByCategoryRow(
  row: Record<string, unknown>
): RevenueByCategoryRow {
  return {
    category: toStringValue(row.category),
    period: toStringValue(row.period),
    quantity: toNumber(row.quantity),
    revenueCents: toNumber(row.revenueCents)
  };
}

function toCsv<T extends Record<string, string | number>>(
  columns: ReadonlyArray<keyof T>,
  rows: T[]
) {
  const header = columns.join(",");
  const body = rows.map((row) =>
    columns.map((column) => csvCell(row[column])).join(",")
  );

  return `${[header, ...body].join("\n")}\n`;
}

function csvCell(value: string | number) {
  const serialized = String(value);
  if (!/[",\n\r]/.test(serialized)) {
    return serialized;
  }

  return `"${serialized.replaceAll('"', '""')}"`;
}

function toNumber(value: unknown) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value ?? 0);
}

function toStringValue(value: unknown) {
  return String(value ?? "");
}

const DATA_DICTIONARY = `# Snapshot Data Dictionary

This directory contains merchant-scoped analysis inputs. All revenue and cost values are integer cents. Revenue summaries include paid orders only.

## Files

- data.json: line-level order facts for the authenticated merchant.
- data.csv: the same line-level facts in CSV form.
- monthly_revenue.csv: paid order revenue by UTC order month with order counts.
- revenue_by_region.csv: monthly paid order revenue by region with order counts. The period column is YYYY-MM.
- revenue_by_category.csv: monthly paid line revenue by product category with quantities. The period column is YYYY-MM.

## Core Columns

- orderId, orderNumber, orderedAt, status: order identity and timing.
- orderRevenueCents, orderCostCents: full order totals; repeat across multiple line rows for the same order.
- lineRevenueCents, lineCostCents, quantity: line-level totals and units.
- sku, productName, category: product descriptors.
- customerId, customerName, customerEmail, region: customer and region descriptors.
`;
