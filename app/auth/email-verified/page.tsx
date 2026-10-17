import { redirect } from "next/navigation";
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

  return <EmailVerifiedClient token={token} />;
}
