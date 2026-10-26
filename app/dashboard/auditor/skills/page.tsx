import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getBlockedRepos, getModeratedSkills } from "@/lib/auditor/mock-data";
import { ModerationContent } from "@/components/auditor/admin/moderation-content";

export const metadata: Metadata = {
  title: "Skills · Auditor de skills",
};

export default async function AdminSkillsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((await getAdminAccess(session)) !== "admin") redirect("/dashboard");
  const [skills, repos] = await Promise.all([
    getModeratedSkills(),
    getBlockedRepos(),
  ]);
  return (
      <ModerationContent skills={skills} repos={repos} />
  );
}
