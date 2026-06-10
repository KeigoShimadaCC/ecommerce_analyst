import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the scaffolded analytics workspace", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "eCommerce Analyst" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Analysis workspace preview")).toBeInTheDocument();
  });
});
