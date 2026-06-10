import type { AuthenticatedSession } from "../auth";
import { getDashboardDatabase } from "./database";

export type DashboardSession = Pick<
  AuthenticatedSession,
  "merchantId" | "merchantName" | "merchantSlug" | "name"
>;

export type KpiMetric = {
  id: "mayRevenue" | "sixMonthRevenue" | "orderCount" | "grossMargin" | "aov";
  label: string;
  value: string;
  detail: string;
};

export type MonthlyRevenuePoint = {
  month: string;
  label: string;
  revenueCents: number;
  orderCount: number;
  marginCents: number;
};

export type DashboardData = {
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  ownerName: string;
  periodLabel: string;
  kpis: KpiMetric[];
  monthlyRevenue: MonthlyRevenuePoint[];
};

type SqliteReader = {
  prepare(sql: string): {
    get(...values: unknown[]): unknown;
    all(...values: unknown[]): Array<Record<string, unknown>>;
  };
};

type MaxOrderRow = {
  latestOrderedAt: string | null;
};

type MonthlyTotalsRow = {
  month: string;
  revenueCents: number | bigint | null;
  costCents: number | bigint | null;
  orderCount: number | bigint | null;
};

export function getDashboardData(session: DashboardSession) {
  return getDashboardDataForSession(getDashboardDatabase(), session);
}

export function getDashboardDataForSession(
  database: SqliteReader,
  session: DashboardSession
): DashboardData {
  const monthRange = getLatestSixMonthRange(database, session.merchantId);
  const monthlyRevenue = getMonthlyRevenue(
    database,
    session.merchantId,
    monthRange
  );
  const may2026 = getMonthTotals(database, session.merchantId, "2026-05");
  const sixMonthTotals = monthlyRevenue.reduce(
    (totals, point) => ({
      costCents: totals.costCents + (point.revenueCents - point.marginCents),
      orderCount: totals.orderCount + point.orderCount,
      revenueCents: totals.revenueCents + point.revenueCents
    }),
    { costCents: 0, orderCount: 0, revenueCents: 0 }
  );
  const grossMarginCents =
    sixMonthTotals.revenueCents - sixMonthTotals.costCents;
  const grossMarginPercent =
    sixMonthTotals.revenueCents > 0
      ? (grossMarginCents / sixMonthTotals.revenueCents) * 100
      : 0;
  const averageOrderValueCents =
    sixMonthTotals.orderCount > 0
      ? Math.round(sixMonthTotals.revenueCents / sixMonthTotals.orderCount)
      : 0;

  return {
    kpis: [
      {
        detail: "Paid order revenue in May 2026",
        id: "mayRevenue",
        label: "May 2026 revenue",
        value: formatCurrency(may2026.revenueCents)
      },
      {
        detail: `${monthRange.startLabel} through ${monthRange.endLabel}`,
        id: "sixMonthRevenue",
        label: "Latest six-month revenue",
        value: formatCurrency(sixMonthTotals.revenueCents)
      },
      {
        detail: "Paid orders in the latest six months",
        id: "orderCount",
        label: "Orders",
        value: formatInteger(sixMonthTotals.orderCount)
      },
      {
        detail: "Revenue less product cost",
        id: "grossMargin",
        label: "Gross margin",
        value: formatPercent(grossMarginPercent)
      },
      {
        detail: "Average paid order value",
        id: "aov",
        label: "AOV",
        value: formatCurrency(averageOrderValueCents)
      }
    ],
    merchantId: session.merchantId,
    merchantName: session.merchantName,
    merchantSlug: session.merchantSlug,
    monthlyRevenue,
    ownerName: session.name,
    periodLabel: `${monthRange.startLabel} - ${monthRange.endLabel}`
  };
}

function getLatestSixMonthRange(database: SqliteReader, merchantId: string) {
  const row = database
    .prepare(
      `
        SELECT MAX("orderedAt") AS latestOrderedAt
        FROM "Order"
        WHERE "merchantId" = ?
          AND "status" = 'paid'
      `
    )
    .get(merchantId);
  const latestOrderedAt = isMaxOrderRow(row) ? row.latestOrderedAt : null;
  const endMonth = latestOrderedAt
    ? toUtcMonthStart(new Date(latestOrderedAt))
    : new Date(Date.UTC(2026, 5, 1));
  const startMonth = addUtcMonths(endMonth, -5);
  const exclusiveEnd = addUtcMonths(endMonth, 1);

  return {
    endIso: exclusiveEnd.toISOString(),
    endLabel: formatMonthLabel(toMonthKey(endMonth)),
    monthKeys: buildMonthKeys(startMonth, 6),
    startIso: startMonth.toISOString(),
    startLabel: formatMonthLabel(toMonthKey(startMonth))
  };
}

function getMonthlyRevenue(
  database: SqliteReader,
  merchantId: string,
  range: ReturnType<typeof getLatestSixMonthRange>
) {
  const rows = database
    .prepare(
      `
        SELECT SUBSTR("orderedAt", 1, 7) AS month,
               SUM("totalRevenueCents") AS revenueCents,
               SUM("totalCostCents") AS costCents,
               COUNT(*) AS orderCount
        FROM "Order"
        WHERE "merchantId" = ?
          AND "status" = 'paid'
          AND "orderedAt" >= ?
          AND "orderedAt" < ?
        GROUP BY SUBSTR("orderedAt", 1, 7)
        ORDER BY month ASC
      `
    )
    .all(merchantId, range.startIso, range.endIso)
    .filter(isMonthlyTotalsRow);
  const totalsByMonth = new Map(rows.map((row) => [row.month, row]));

  return range.monthKeys.map((month) => {
    const totals = totalsByMonth.get(month);
    const revenueCents = toNumber(totals?.revenueCents);
    const costCents = toNumber(totals?.costCents);

    return {
      label: formatMonthLabel(month),
      marginCents: revenueCents - costCents,
      month,
      orderCount: toNumber(totals?.orderCount),
      revenueCents
    };
  });
}

function getMonthTotals(
  database: SqliteReader,
  merchantId: string,
  month: string
) {
  const startMonth = parseMonthKey(month);
  const endMonth = addUtcMonths(startMonth, 1);
  const row = database
    .prepare(
      `
        SELECT SUM("totalRevenueCents") AS revenueCents,
               SUM("totalCostCents") AS costCents,
               COUNT(*) AS orderCount
        FROM "Order"
        WHERE "merchantId" = ?
          AND "status" = 'paid'
          AND "orderedAt" >= ?
          AND "orderedAt" < ?
      `
    )
    .get(merchantId, startMonth.toISOString(), endMonth.toISOString());

  const totalsRow = { ...(isRecord(row) ? row : {}), month };

  if (!isMonthlyTotalsRow(totalsRow)) {
    return { costCents: 0, orderCount: 0, revenueCents: 0 };
  }

  return {
    costCents: toNumber(totalsRow.costCents),
    orderCount: toNumber(totalsRow.orderCount),
    revenueCents: toNumber(totalsRow.revenueCents)
  };
}

function buildMonthKeys(startMonth: Date, count: number) {
  return Array.from({ length: count }, (_, index) =>
    toMonthKey(addUtcMonths(startMonth, index))
  );
}

function parseMonthKey(month: string) {
  const [year, monthNumber] = month.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

function toUtcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  );
}

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(cents / 100);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function toNumber(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value ?? 0);
}

function isMaxOrderRow(row: unknown): row is MaxOrderRow {
  return (
    isRecord(row) &&
    (typeof row.latestOrderedAt === "string" || row.latestOrderedAt === null)
  );
}

function isMonthlyTotalsRow(row: unknown): row is MonthlyTotalsRow {
  return (
    isRecord(row) &&
    typeof row.month === "string" &&
    isSqlNumber(row.revenueCents) &&
    isSqlNumber(row.costCents) &&
    isSqlNumber(row.orderCount)
  );
}

function isSqlNumber(value: unknown) {
  return (
    typeof value === "number" || typeof value === "bigint" || value === null
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
