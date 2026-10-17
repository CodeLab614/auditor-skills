import { RegisterForm } from "@/components/auth";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <RegisterForm />;
}
