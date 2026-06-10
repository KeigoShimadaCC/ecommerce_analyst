import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { execaSync } from "execa";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(rootDir, ".env");
const defaultDatabaseUrl = "file:./dev.db";
const prismaBin = resolve(rootDir, "node_modules/.bin/prisma");

function ensureDatabaseEnv() {
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `DATABASE_URL="${defaultDatabaseUrl}"\n`, {
      flag: "wx"
    });
    return;
  }

  const currentEnv = readFileSync(envPath, "utf8");
  if (/^DATABASE_URL=/m.test(currentEnv)) {
    return;
  }

  const separator = currentEnv.length > 0 && !currentEnv.endsWith("\n") ? "\n" : "";
  writeFileSync(
    envPath,
    `${currentEnv}${separator}DATABASE_URL="${defaultDatabaseUrl}"\n`
  );
}

function runPrisma(args) {
  execaSync(prismaBin, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit"
  });
}

function readDatabaseUrl() {
  const currentEnv = readFileSync(envPath, "utf8");
  const match = currentEnv.match(/^DATABASE_URL=(?:"([^"]+)"|([^\n]+))/m);
  return match?.[1] ?? match?.[2] ?? defaultDatabaseUrl;
}

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Expected a SQLite file: DATABASE_URL, received ${databaseUrl}`);
  }

  const sqlitePath = databaseUrl.slice("file:".length);
  return resolve(rootDir, sqlitePath);
}

async function main() {
  ensureDatabaseEnv();
  runPrisma(["generate"]);
  runPrisma(["db", "push"]);

  const { seedDatabase } = await import("../src/lib/data/seed.mjs");
  const database = new DatabaseSync(resolveSqlitePath(readDatabaseUrl()));
  try {
    const summary = seedDatabase(database);
    console.log("Seeded deterministic demo data.");
    console.log("Demo credentials:");
    for (const credential of summary.credentials) {
      console.log(`- ${credential.email} / ${credential.password}`);
    }
    console.log("Cardinalities:");
    console.log(JSON.stringify(summary.cardinalities, null, 2));
  } finally {
    database.close();
  }
}

main().catch((error) => {
  console.error("Failed to prepare the Prisma SQLite database.", error);
  process.exitCode = 1;
});
