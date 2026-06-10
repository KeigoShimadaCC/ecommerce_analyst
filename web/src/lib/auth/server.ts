import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS
} from "./cookies";
import { getAuthDatabase } from "./database";
import {
  getAuthenticatedSession,
  invalidateSession,
  loginWithPassword
} from "./session";

export async function signInWithPassword(email: string, password: string) {
  const result = await loginWithPassword(getAuthDatabase(), email, password);

  if (!result.ok) {
    return result;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.cookieValue, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return result;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return getAuthenticatedSession(
    getAuthDatabase(),
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function signOutCurrentSession() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await invalidateSession(getAuthDatabase(), cookieValue);
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}
