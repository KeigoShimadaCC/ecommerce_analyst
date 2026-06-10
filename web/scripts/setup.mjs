import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

async function main() {
  ensureDatabaseEnv();
  runPrisma(["generate"]);
  runPrisma(["db", "push"]);
}

main().catch((error) => {
  console.error("Failed to prepare the Prisma SQLite database.", error);
  process.exitCode = 1;
});
