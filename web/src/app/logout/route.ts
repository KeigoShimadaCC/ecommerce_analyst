import { redirect } from "next/navigation";
import { signOutCurrentSession } from "../../lib/auth/server";

export async function GET() {
  await signOutCurrentSession();
  redirect("/login");
}

export async function POST() {
  await signOutCurrentSession();
  redirect("/login");
}
