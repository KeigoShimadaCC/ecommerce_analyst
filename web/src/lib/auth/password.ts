import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "sha256";
const HASH_SCHEME = "pbkdf2_sha256";

export function verifyPassword(password: string, passwordHash: string) {
  const parsed = parsePasswordHash(passwordHash);
  if (!parsed) {
    return false;
  }

  try {
    const expectedDigest = Buffer.from(parsed.digest, "base64");
    if (expectedDigest.length === 0) {
      return false;
    }

    const candidateDigest = pbkdf2Sync(
      password,
      parsed.salt,
      parsed.iterations,
      expectedDigest.length,
      HASH_ALGORITHM
    );

    return timingSafeEqual(candidateDigest, expectedDigest);
  } catch (error) {
    console.error("Failed to verify password hash.", error);
    return false;
  }
}

function parsePasswordHash(passwordHash: string) {
  const [scheme, iterationsValue, salt, digest] = passwordHash.split("$");
  const iterations = Number(iterationsValue);

  if (
    scheme !== HASH_SCHEME ||
    !Number.isSafeInteger(iterations) ||
    iterations <= 0 ||
    !salt ||
    !digest
  ) {
    return null;
  }

  return {
    digest,
    iterations,
    salt
  };
}
