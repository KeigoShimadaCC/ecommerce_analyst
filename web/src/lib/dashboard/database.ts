import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { resolveDatabaseUrl } from "../config/database";

const globalForDashboardDatabase = globalThis as typeof globalThis & {
  dashboardDatabase?: DatabaseSync;
};

export function getDashboardDatabase() {
  if (!globalForDashboardDatabase.dashboardDatabase) {
    globalForDashboardDatabase.dashboardDatabase = new DatabaseSync(
      resolveSqlitePath(resolveDatabaseUrl())
    );
    globalForDashboardDatabase.dashboardDatabase.exec("PRAGMA foreign_keys = ON");
  }

  return globalForDashboardDatabase.dashboardDatabase;
}

function resolveSqlitePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Expected a SQLite file: DATABASE_URL, received ${databaseUrl}`);
  }

  return resolve(process.cwd(), databaseUrl.slice("file:".length));
}
