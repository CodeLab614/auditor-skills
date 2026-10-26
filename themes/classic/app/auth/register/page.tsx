import { redirectToFirstRunIfNoAdmin } from "@/lib/first-run-admin";
import { RegisterForm } from "@/components/auth";
import { getSession } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  await redirectToFirstRunIfNoAdmin();
  const session = await getSession();
  if (session) redirect("/dashboard");
  const { github } = getEnv().config;

  return (
    <RegisterForm
      githubEnabled={github.enabled}
    />
  );
}
