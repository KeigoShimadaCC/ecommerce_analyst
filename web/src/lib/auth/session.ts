import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  SESSION_MAX_AGE_SECONDS,
  decodeSessionCookie,
  signSessionCookie
} from "./cookies";
import { verifyPassword } from "./password";

export type AuthDatabase = {
  prepare(sql: string): {
    get(...values: unknown[]): unknown;
    run(...values: unknown[]): { changes?: bigint | number };
  };
};

export type AuthenticatedSession = {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  expiresAt: Date;
};

export type LoginResult =
  | {
      ok: true;
      cookieValue: string;
      expiresAt: Date;
      session: AuthenticatedSession;
    }
  | {
      ok: false;
      reason: "invalid_credentials";
    };

type LoginOptions = {
  now?: Date;
  maxAgeSeconds?: number;
};

type CreateSessionOptions = {
  now?: Date;
  maxAgeSeconds?: number;
};

type ResolveSessionOptions = {
  now?: Date;
};

type UserRow = {
  email: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  name: string;
  passwordHash: string;
  role: string;
  userId: string;
};

type SessionRow = {
  email: string;
  expiresAt: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  name: string;
  role: string;
  sessionId: string;
  tokenHash: string;
  userId: string;
};

export async function loginWithPassword(
  database: AuthDatabase,
  email: string,
  password: string,
  options: LoginOptions = {}
): Promise<LoginResult> {
  const user = findUserByEmail(database, normalizeEmail(email));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return {
      ok: false,
      reason: "invalid_credentials"
    };
  }

  const created = await createSessionForUser(database, user.userId, options);
  const session: AuthenticatedSession = {
    email: user.email,
    expiresAt: created.expiresAt,
    merchantId: user.merchantId,
    merchantName: user.merchantName,
    merchantSlug: user.merchantSlug,
    name: user.name,
    role: user.role,
    sessionId: created.sessionId,
    userId: user.userId
  };

  return {
    ok: true,
    cookieValue: created.cookieValue,
    expiresAt: created.expiresAt,
    session
  };
}

export async function createSessionForUser(
  database: AuthDatabase,
  userId: string,
  options: CreateSessionOptions = {}
) {
  const now = options.now ?? new Date();
  const maxAgeSeconds = options.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS;
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000);
  const sessionId = randomBytes(24).toString("base64url");
  const token = randomBytes(32).toString("base64url");

  database
    .prepare(
      `
        INSERT INTO "Session" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(
      sessionId,
      userId,
      hashSessionToken(token),
      expiresAt.toISOString(),
      now.toISOString()
    );

  return {
    cookieValue: signSessionCookie(sessionId, token),
    expiresAt,
    sessionId
  };
}

export async function getAuthenticatedSession(
  database: AuthDatabase,
  cookieValue: string | undefined,
  options: ResolveSessionOptions = {}
): Promise<AuthenticatedSession | null> {
  const decodedCookie = decodeSessionCookie(cookieValue);
  if (!decodedCookie) {
    return null;
  }

  const session = findSessionById(database, decodedCookie.sessionId);
  if (!session) {
    return null;
  }

  if (!constantHashEqual(session.tokenHash, hashSessionToken(decodedCookie.token))) {
    return null;
  }

  const expiresAt = new Date(session.expiresAt);
  const now = options.now ?? new Date();
  if (expiresAt.getTime() <= now.getTime()) {
    try {
      deleteSessionById(database, session.sessionId);
    } catch (error) {
      console.error("Failed to delete expired auth session.", error);
    }
    return null;
  }

  return toAuthenticatedSession(session, expiresAt);
}

export async function invalidateSession(
  database: AuthDatabase,
  cookieValue: string | undefined
) {
  const decodedCookie = decodeSessionCookie(cookieValue);
  if (!decodedCookie) {
    return {
      deleted: false
    };
  }

  const result = database
    .prepare(
      `
        DELETE FROM "Session"
        WHERE "id" = ? AND "tokenHash" = ?
      `
    )
    .run(decodedCookie.sessionId, hashSessionToken(decodedCookie.token));

  return {
    deleted: Number(result.changes ?? 0) > 0
  };
}

function findUserByEmail(database: AuthDatabase, email: string) {
  const row = database
    .prepare(
      `
        SELECT
          "User"."id" AS "userId",
          "User"."merchantId",
          "User"."email",
          "User"."name",
          "User"."passwordHash",
          "User"."role",
          "Merchant"."name" AS "merchantName",
          "Merchant"."slug" AS "merchantSlug"
        FROM "User"
        INNER JOIN "Merchant" ON "Merchant"."id" = "User"."merchantId"
        WHERE LOWER("User"."email") = ?
        LIMIT 1
      `
    )
    .get(email);

  return isUserRow(row) ? row : null;
}

function findSessionById(database: AuthDatabase, sessionId: string) {
  const row = database
    .prepare(
      `
        SELECT
          "Session"."id" AS "sessionId",
          "Session"."userId",
          "Session"."tokenHash",
          "Session"."expiresAt",
          "User"."merchantId",
          "User"."email",
          "User"."name",
          "User"."role",
          "Merchant"."name" AS "merchantName",
          "Merchant"."slug" AS "merchantSlug"
        FROM "Session"
        INNER JOIN "User" ON "User"."id" = "Session"."userId"
        INNER JOIN "Merchant" ON "Merchant"."id" = "User"."merchantId"
        WHERE "Session"."id" = ?
        LIMIT 1
      `
    )
    .get(sessionId);

  return isSessionRow(row) ? row : null;
}

function deleteSessionById(database: AuthDatabase, sessionId: string) {
  database.prepare('DELETE FROM "Session" WHERE "id" = ?').run(sessionId);
}

function toAuthenticatedSession(row: SessionRow, expiresAt: Date) {
  return {
    email: row.email,
    expiresAt,
    merchantId: row.merchantId,
    merchantName: row.merchantName,
    merchantSlug: row.merchantSlug,
    name: row.name,
    role: row.role,
    sessionId: row.sessionId,
    userId: row.userId
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function constantHashEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isUserRow(row: unknown): row is UserRow {
  return (
    isRecord(row) &&
    typeof row.email === "string" &&
    typeof row.merchantId === "string" &&
    typeof row.merchantName === "string" &&
    typeof row.merchantSlug === "string" &&
    typeof row.name === "string" &&
    typeof row.passwordHash === "string" &&
    typeof row.role === "string" &&
    typeof row.userId === "string"
  );
}

function isSessionRow(row: unknown): row is SessionRow {
  return (
    isRecord(row) &&
    typeof row.email === "string" &&
    typeof row.expiresAt === "string" &&
    typeof row.merchantId === "string" &&
    typeof row.merchantName === "string" &&
    typeof row.merchantSlug === "string" &&
    typeof row.name === "string" &&
    typeof row.role === "string" &&
    typeof row.sessionId === "string" &&
    typeof row.tokenHash === "string" &&
    typeof row.userId === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
