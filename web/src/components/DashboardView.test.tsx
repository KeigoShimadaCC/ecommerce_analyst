import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardView, RevenueTrend } from "./DashboardView";
import type { DashboardData } from "../lib/dashboard/data";

describe("DashboardView", () => {
  it("renders KPI tiles and the revenue trend table", () => {
    render(<DashboardView data={buildDashboardData()} />);

    expect(
      screen.getByRole("heading", { name: "Aurora Outfitters" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Key performance indicators" })
    ).toBeInTheDocument();
    expect(screen.getByText("May 2026 revenue")).toBeInTheDocument();
    expect(screen.getAllByText("$8,170")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Monthly revenue trend" })
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders an empty trend without leaking a literal zero", () => {
    const { container } = render(<RevenueTrend points={[]} />);

    expect(
      screen.getByText("No revenue trend data is available.")
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/\b0\b/);
  });

  it("renders zero-value rows as intentional currency and counts only", () => {
    render(
      <RevenueTrend
        points={[
          {
            label: "Jun 2026",
            marginCents: 0,
            month: "2026-06",
            orderCount: 0,
            revenueCents: 0
          }
        ]}
      />
    );

    const row = screen.getByRole("row", { name: /Jun 2026/ });
    expect(within(row).getAllByText("$0")).toHaveLength(2);
    expect(within(row).getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });
});

function buildDashboardData(): DashboardData {
  return {
    kpis: [
      {
        detail: "Paid order revenue in May 2026",
        id: "mayRevenue",
        label: "May 2026 revenue",
        value: "$8,170"
      },
      {
        detail: "Jan 2026 through Jun 2026",
        id: "sixMonthRevenue",
        label: "Latest six-month revenue",
        value: "$42,000"
      },
      {
        detail: "Paid orders in the latest six months",
        id: "orderCount",
        label: "Orders",
        value: "540"
      },
      {
        detail: "Revenue less product cost",
        id: "grossMargin",
        label: "Gross margin",
        value: "58.1%"
      },
      {
        detail: "Average paid order value",
        id: "aov",
        label: "AOV",
        value: "$78"
      }
    ],
    merchantId: "merchant-aurora",
    merchantName: "Aurora Outfitters",
    merchantSlug: "aurora",
    monthlyRevenue: [
      {
        label: "May 2026",
        marginCents: 390000,
        month: "2026-05",
        orderCount: 90,
        revenueCents: 816960
      },
      {
        label: "Jun 2026",
        marginCents: 350000,
        month: "2026-06",
        orderCount: 90,
        revenueCents: 748880
      }
    ],
    ownerName: "Aurora Outfitters Owner",
    periodLabel: "Jan 2026 - Jun 2026"
  };
}
