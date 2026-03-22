import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EmailVerifiedClient } from "./client";

interface EmailVerifiedPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function EmailVerifiedPage({
  searchParams,
}: EmailVerifiedPageProps) {
  const { token } = await searchParams;

  // No token provided, redirect to login
  if (!token) {
    redirect("/auth/login");
  }

  let verified = false;
  let alreadyVerified = false;

  try {
    await auth.api.verifyEmail({
      query: { token },
    });
    verified = true;
  } catch (error) {
    // Check if already verified
    if (error instanceof Error && error.message.toLowerCase().includes("already")) {
      alreadyVerified = true;
    }
    verified = false;
  }

  return <EmailVerifiedClient verified={verified} alreadyVerified={alreadyVerified} />;
}
