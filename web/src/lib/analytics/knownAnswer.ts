export const MAY_2026_REVENUE_BY_REGION_QUERY =
  "For May 2026, show total revenue by region as a bar chart and recommend the region to focus next month.";

export type RevenueByRegionBar = {
  region: string;
  revenueCents: number;
};

export type RevenueByRegionAnswer = {
  question: string;
  merchantId: string;
  month: "2026-05";
  chart: {
    type: "bar";
    x: "region";
    y: "revenueCents";
    bars: RevenueByRegionBar[];
  };
  leadingRegion: string;
  recommendation: string;
};

type SqliteReader = {
  prepare(sql: string): {
    all(...values: unknown[]): Array<Record<string, unknown>>;
  };
};

export function getMay2026RevenueByRegion(
  database: SqliteReader,
  merchantId: string
): RevenueByRegionAnswer {
  const rows = database
    .prepare(
      `
        SELECT "Region"."name" AS region,
               SUM("Order"."totalRevenueCents") AS revenueCents
        FROM "Order"
        INNER JOIN "Region" ON "Region"."id" = "Order"."regionId"
        WHERE "Order"."merchantId" = ?
          AND "Order"."status" = 'paid'
          AND "Order"."orderedAt" >= '2026-05-01T00:00:00.000Z'
          AND "Order"."orderedAt" < '2026-06-01T00:00:00.000Z'
        GROUP BY "Region"."name"
        ORDER BY "Region"."name" ASC
      `
    )
    .all(merchantId);

  const bars = rows.map((row) => ({
    region: String(row.region),
    revenueCents: Number(row.revenueCents ?? 0)
  }));

  const leadingBar = bars.reduce<RevenueByRegionBar | undefined>(
    (currentLeader, bar) => {
      if (!currentLeader || bar.revenueCents > currentLeader.revenueCents) {
        return bar;
      }
      return currentLeader;
    },
    undefined
  );

  const leadingRegion = leadingBar?.region ?? "No region";

  return {
    question: MAY_2026_REVENUE_BY_REGION_QUERY,
    merchantId,
    month: "2026-05",
    chart: {
      type: "bar",
      x: "region",
      y: "revenueCents",
      bars
    },
    leadingRegion,
    recommendation: `Focus next month on ${leadingRegion}, the highest-revenue region for May 2026.`
  };
}
