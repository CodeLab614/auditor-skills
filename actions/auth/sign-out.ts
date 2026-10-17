"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";

export async function signOut() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user?.id) {
      await logActivity(session.user.id, "logout");
    }

    await auth.api.signOut({
      headers: await headers(),
    });
  } catch {
    // Ignore errors on signout
  }

  redirect("/auth/login");
}
