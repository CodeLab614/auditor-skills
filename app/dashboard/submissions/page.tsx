import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SubmissionsContent } from "@/components/auditor/submissions-content";
import { getMySubmissions, getQuota } from "@/lib/auditor/queries";

export const metadata: Metadata = {
  title: "Mis envíos · Auditor de skills",
};

export default async function SubmissionsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth/login");
  const [submissions, quota] = await Promise.all([
    getMySubmissions(session.user.id),
    getQuota(session.user.id),
  ]);
  return <SubmissionsContent submissions={submissions} quota={quota} />;
}
