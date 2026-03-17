"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signInWithGoogle(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const { url } = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: "/dashboard",
      },
      headers: await headers(),
    });

    if (url) {
      redirect(url);
    }

    return { success: true };
  } catch (error) {
    // redirect() throws an error, so we need to re-throw it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Failed to sign in with Google:", error);
    return { success: false, error: "Failed to sign in with Google" };
  }
}

export async function signInWithGithub(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const { url } = await auth.api.signInSocial({
      body: {
        provider: "github",
        callbackURL: "/dashboard",
      },
      headers: await headers(),
    });

    if (url) {
      redirect(url);
    }

    return { success: true };
  } catch (error) {
    // redirect() throws an error, so we need to re-throw it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Failed to sign in with GitHub:", error);
    return { success: false, error: "Failed to sign in with GitHub" };
  }
}
