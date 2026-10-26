import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getQuota } from "@/lib/auditor/queries";
import { SubmitContent } from "@/components/auditor/submit-content";

export const metadata: Metadata = {
  title: "Enviar una skill · Auditor de skills",
};

export default async function SubmitPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth/login");
  return <SubmitContent quota={await getQuota(session.user.id)} />;
}
