import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./src/lib/config/database";

export default defineConfig({
  plugins: [react()],
  test: {
    env: {
      DATABASE_URL: TEST_DATABASE_URL
    },
    environment: "jsdom",
    globals: true,
    globalSetup: ["./vitest.global-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"]
  }
});
