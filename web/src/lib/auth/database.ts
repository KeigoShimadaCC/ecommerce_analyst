import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { resolveDatabaseUrl } from "../config/database";

const globalForAuthDatabase = globalThis as typeof globalThis & {
  authDatabase?: DatabaseSync;
};

export function getAuthDatabase() {
  if (!globalForAuthDatabase.authDatabase) {
    globalForAuthDatabase.authDatabase = new DatabaseSync(
      resolveSqlitePath(resolveDatabaseUrl())
    );
    globalForAuthDatabase.authDatabase.exec("PRAGMA foreign_keys = ON");
  }

  return globalForAuthDatabase.authDatabase;
}

function resolveSqlitePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Expected a SQLite file: DATABASE_URL, received ${databaseUrl}`);
  }

  return resolve(process.cwd(), databaseUrl.slice("file:".length));
}
