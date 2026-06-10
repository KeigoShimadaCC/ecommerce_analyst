import { describe, expect, it, vi } from "vitest";
import Home from "./page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  })
}));

describe("Home", () => {
  it("sends users into the guarded dashboard path", () => {
    expect(() => Home()).toThrow("NEXT_REDIRECT:/dashboard");

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
