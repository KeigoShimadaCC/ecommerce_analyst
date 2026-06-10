import { closeSync, openSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execaSync } from "execa";
import type { TestProject } from "vitest/node";
import { TEST_DATABASE_URL } from "./src/lib/config/database";

const rootDir = dirname(fileURLToPath(import.meta.url));
const prismaBin = resolve(rootDir, "node_modules/.bin/prisma");
const sqliteArtifacts = [
  resolve(rootDir, "test.db"),
  resolve(rootDir, "test.db-journal"),
  resolve(rootDir, "prisma/test.db"),
  resolve(rootDir, "prisma/test.db-journal")
];
const primaryTestDatabase = resolve(rootDir, "test.db");

function runPrisma(args: string[]) {
  execaSync(prismaBin, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL
    },
    stdio: "inherit"
  });
}

export default function setup(project: TestProject) {
  for (const artifact of sqliteArtifacts) {
    rmSync(artifact, { force: true });
  }
  closeSync(openSync(primaryTestDatabase, "w"));

  process.env.DATABASE_URL = TEST_DATABASE_URL;
  runPrisma(["generate"]);
  runPrisma(["db", "push"]);
  project.provide("databaseUrl", TEST_DATABASE_URL);
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
