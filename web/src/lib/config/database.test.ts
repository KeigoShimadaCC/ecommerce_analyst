import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl, TEST_DATABASE_URL } from "./database";

describe("resolveDatabaseUrl", () => {
  it("reads Vitest's isolated SQLite database URL", () => {
    expect(resolveDatabaseUrl()).toBe(TEST_DATABASE_URL);
  });

  it("falls back to the local development SQLite database when unset", () => {
    expect(resolveDatabaseUrl({})).toBe("file:./dev.db");
  });
});
