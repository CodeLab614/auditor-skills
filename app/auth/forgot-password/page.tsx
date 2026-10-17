import { ForgotPasswordForm } from "@/components/auth";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <ForgotPasswordForm />;
}
