import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { resolveDatabaseUrl } from "../config/database";

const globalForAnalysisDatabase = globalThis as typeof globalThis & {
  analysisDatabase?: DatabaseSync;
};

export function getAnalysisDatabase() {
  if (!globalForAnalysisDatabase.analysisDatabase) {
    globalForAnalysisDatabase.analysisDatabase = new DatabaseSync(
      resolveSqlitePath(resolveDatabaseUrl())
    );
    globalForAnalysisDatabase.analysisDatabase.exec("PRAGMA foreign_keys = ON");
  }

  return globalForAnalysisDatabase.analysisDatabase;
}

function resolveSqlitePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      `Expected a SQLite file: DATABASE_URL, received ${databaseUrl}`
    );
  }

  return resolve(process.cwd(), databaseUrl.slice("file:".length));
}
