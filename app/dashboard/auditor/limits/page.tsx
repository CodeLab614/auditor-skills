import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getPlatformLimits } from "@/lib/auditor/mock-data";
import { LimitsContent } from "@/components/auditor/admin/limits-content";

export const metadata: Metadata = {
  title: "Límites · Auditor de skills",
};

export default async function LimitsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((await getAdminAccess(session)) !== "admin") redirect("/dashboard");
  return (
      <LimitsContent limits={await getPlatformLimits()} />
  );
}
