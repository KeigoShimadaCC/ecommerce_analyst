"use server";

import { redirect } from "next/navigation";
import { signInWithPassword } from "../../lib/auth/server";

export async function loginAction(formData: FormData) {
  const email = readFormValue(formData, "email");
  const password = readFormValue(formData, "password");

  if (!email || !password) {
    redirect(`/login?error=missing&email=${encodeURIComponent(email)}`);
  }

  const result = await signInWithPassword(email, password);

  if (!result.ok) {
    redirect(`/login?error=invalid&email=${encodeURIComponent(email)}`);
  }

  redirect("/dashboard");
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
