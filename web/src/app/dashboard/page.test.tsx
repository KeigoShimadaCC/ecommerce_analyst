import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";
import { requireCurrentSession } from "../../lib/auth";
import { getDashboardData } from "../../lib/dashboard/data";
import type { AuthenticatedSession } from "../../lib/auth";
import type { DashboardData } from "../../lib/dashboard/data";

vi.mock("../../lib/auth", () => ({
  requireCurrentSession: vi.fn()
}));

vi.mock("../../lib/dashboard/data", () => ({
  getDashboardData: vi.fn()
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(requireCurrentSession).mockReset();
    vi.mocked(getDashboardData).mockReset();
  });

  it("requires an authenticated session before rendering dashboard data", async () => {
    const session = buildSession();
    const data = buildDashboardData();
    vi.mocked(requireCurrentSession).mockResolvedValue(session);
    vi.mocked(getDashboardData).mockReturnValue(data);

    render(await DashboardPage());

    expect(requireCurrentSession).toHaveBeenCalledTimes(1);
    expect(getDashboardData).toHaveBeenCalledWith(session);
    expect(
      screen.getByRole("heading", { name: "Aurora Outfitters" })
    ).toBeInTheDocument();
    expect(screen.getByText("$8,170")).toBeInTheDocument();
  });
});

function buildSession(): AuthenticatedSession {
  return {
    email: "owner@aurora.example",
    expiresAt: new Date("2026-06-11T00:00:00.000Z"),
    merchantId: "merchant-aurora",
    merchantName: "Aurora Outfitters",
    merchantSlug: "aurora",
    name: "Aurora Outfitters Owner",
    role: "owner",
    sessionId: "session-1",
    userId: "user-aurora-owner"
  };
}

function buildDashboardData(): DashboardData {
  return {
    kpis: [
      {
        detail: "Paid order revenue in May 2026",
        id: "mayRevenue",
        label: "May 2026 revenue",
        value: "$8,170"
      }
    ],
    merchantId: "merchant-aurora",
    merchantName: "Aurora Outfitters",
    merchantSlug: "aurora",
    monthlyRevenue: [],
    ownerName: "Aurora Outfitters Owner",
    periodLabel: "Jan 2026 - Jun 2026"
  };
}
