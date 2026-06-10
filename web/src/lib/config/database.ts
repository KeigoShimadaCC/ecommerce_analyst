export const DEFAULT_DATABASE_URL = "file:./dev.db";
export const TEST_DATABASE_URL = "file:./test.db";

type DatabaseEnv = {
  DATABASE_URL?: string;
};

export function resolveDatabaseUrl(env?: DatabaseEnv) {
  const databaseUrl = (env ?? process.env).DATABASE_URL?.trim();
  return databaseUrl && databaseUrl.length > 0
    ? databaseUrl
    : DEFAULT_DATABASE_URL;
}
