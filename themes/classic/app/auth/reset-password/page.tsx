import { ResetPasswordForm } from "@/components/auth";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { token } = await searchParams;

  return <ResetPasswordForm token={token} />;
}
