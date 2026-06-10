import { DatabaseSync } from "node:sqlite";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEMO_CREDENTIALS, hashPassword, seedDatabase } from "../data/seed.mjs";
import { decodeSessionCookie } from "./cookies";
import {
  getAuthenticatedSession,
  invalidateSession,
  loginWithPassword
} from "./session";
import { verifyPassword } from "./password";

describe.sequential("custom session auth", () => {
  const schemaDatabasePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../test.db"
  );
  const credential = DEMO_CREDENTIALS[0];
  const fixedNow = new Date("2026-06-10T00:00:00.000Z");
  let sqliteDatabase: DatabaseSync;
  let tempDatabaseDir: string;

  beforeAll(() => {
    tempDatabaseDir = mkdtempSync(resolve(tmpdir(), "ecommerce-auth-test-"));
    const tempDatabasePath = resolve(tempDatabaseDir, "auth.db");
    copyFileSync(schemaDatabasePath, tempDatabasePath);
    sqliteDatabase = new DatabaseSync(tempDatabasePath);
  });

  beforeEach(async () => {
    seedDatabase(sqliteDatabase);
    sqliteDatabase.prepare('DELETE FROM "Session"').run();
  });

  afterAll(async () => {
    sqliteDatabase.close();
    rmSync(tempDatabaseDir, { force: true, recursive: true });
  });

  it("verifies deterministic seed password hashes", () => {
    const passwordHash = hashPassword(credential.password);

    expect(verifyPassword(credential.password, passwordHash)).toBe(true);
    expect(verifyPassword("not-the-demo-password", passwordHash)).toBe(false);
    expect(verifyPassword(credential.password, "unsupported$hash")).toBe(false);
  });

  it("creates a signed cookie backed by a server-side session row", async () => {
    const result = await loginWithPassword(
      sqliteDatabase,
      credential.email,
      credential.password,
      {
        now: fixedNow
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected demo credential login to succeed.");
    }

    const decodedCookie = decodeSessionCookie(result.cookieValue);
    expect(decodedCookie?.sessionId).toBe(result.session.sessionId);
    expect(decodedCookie?.token).toBeTruthy();

    const storedSession = findSession(result.session.sessionId);

    expect(storedSession).not.toBeNull();
    expect(storedSession?.userId).toBe(result.session.userId);
    expect(storedSession?.tokenHash).not.toContain(decodedCookie?.token ?? "");

    const resolvedSession = await getAuthenticatedSession(
      sqliteDatabase,
      result.cookieValue,
      {
        now: fixedNow
      }
    );

    expect(resolvedSession).toMatchObject({
      email: credential.email,
      merchantId: credential.merchantId,
      merchantName: credential.merchantName,
      userId: result.session.userId
    });
  });

  it("rejects invalid credentials without creating a session", async () => {
    const result = await loginWithPassword(
      sqliteDatabase,
      credential.email,
      "wrong-password",
      {
        now: fixedNow
      }
    );

    expect(result).toEqual({
      ok: false,
      reason: "invalid_credentials"
    });
    expect(countSessions()).toBe(0);
  });

  it("returns null for invalid and expired sessions", async () => {
    await expect(
      getAuthenticatedSession(sqliteDatabase, "not-a-valid-cookie")
    ).resolves.toBeNull();

    const result = await loginWithPassword(
      sqliteDatabase,
      credential.email,
      credential.password,
      {
        maxAgeSeconds: -1,
        now: fixedNow
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected expired demo session creation to succeed.");
    }

    await expect(
      getAuthenticatedSession(sqliteDatabase, result.cookieValue, {
        now: fixedNow
      })
    ).resolves.toBeNull();
    expect(countSessions(result.session.sessionId)).toBe(0);
  });

  it("invalidates logout sessions", async () => {
    const result = await loginWithPassword(
      sqliteDatabase,
      credential.email,
      credential.password,
      {
        now: fixedNow
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected demo credential login to succeed.");
    }

    await expect(
      invalidateSession(sqliteDatabase, result.cookieValue)
    ).resolves.toEqual({
      deleted: true
    });
    await expect(
      getAuthenticatedSession(sqliteDatabase, result.cookieValue, {
        now: fixedNow
      })
    ).resolves.toBeNull();
  });

  it("supplies merchant identity from the authenticated session context", async () => {
    const result = await loginWithPassword(
      sqliteDatabase,
      credential.email.toUpperCase(),
      credential.password,
      {
        now: fixedNow
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected normalized demo credential login to succeed.");
    }

    const sessionContext = await getAuthenticatedSession(
      sqliteDatabase,
      result.cookieValue,
      {
        now: fixedNow
      }
    );

    expect(sessionContext?.merchantId).toBe(credential.merchantId);
    expect(sessionContext?.merchantSlug).toBe("aurora");
  });

  function findSession(sessionId: string) {
    return sqliteDatabase
      .prepare(
        'SELECT "userId", "tokenHash" FROM "Session" WHERE "id" = ? LIMIT 1'
      )
      .get(sessionId) as { tokenHash: string; userId: string } | undefined;
  }

  function countSessions(sessionId?: string) {
    const row = sessionId
      ? sqliteDatabase
          .prepare('SELECT COUNT(*) AS count FROM "Session" WHERE "id" = ?')
          .get(sessionId)
      : sqliteDatabase.prepare('SELECT COUNT(*) AS count FROM "Session"').get();
    return Number((row as { count: number } | undefined)?.count ?? 0);
  }
});
