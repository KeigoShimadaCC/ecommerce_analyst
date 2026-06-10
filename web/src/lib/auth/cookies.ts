import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "ea_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const LOCAL_DEMO_AUTH_SECRET = "phase-01-local-demo-session-secret";

export type DecodedSessionCookie = {
  sessionId: string;
  token: string;
};

export function getAuthSecret(env: NodeJS.ProcessEnv = process.env) {
  const configuredSecret = env.AUTH_SECRET?.trim();
  return configuredSecret && configuredSecret.length > 0
    ? configuredSecret
    : LOCAL_DEMO_AUTH_SECRET;
}

export function signSessionCookie(
  sessionId: string,
  token: string,
  secret = getAuthSecret()
) {
  const payload = `${sessionId}.${token}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function decodeSessionCookie(
  cookieValue: string | undefined,
  secret = getAuthSecret()
): DecodedSessionCookie | null {
  if (!cookieValue) {
    return null;
  }

  const parts = cookieValue.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [sessionId, token, signature] = parts;
  if (!sessionId || !token || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${sessionId}.${token}`)
    .digest("base64url");

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  return {
    sessionId,
    token
  };
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
