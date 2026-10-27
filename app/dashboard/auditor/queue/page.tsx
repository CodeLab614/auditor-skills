import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getAdminJobs } from "@/lib/auditor/queries";
import { JobsContent } from "@/components/auditor/admin/jobs-content";

export const metadata: Metadata = {
  title: "Cola de análisis · Auditor de skills",
};

export default async function JobsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((await getAdminAccess(session)) !== "admin") redirect("/dashboard");
  return (
      <JobsContent jobs={await getAdminJobs()} />
  );
}
