import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getBlockedRepos, getSkills } from "@/lib/auditor/queries";
import { ModerationContent } from "@/components/auditor/admin/moderation-content";
import { getColumnsCookieName, readHiddenColumns } from "@/lib/table-columns";
import type { RawSearchParams } from "@/lib/table-query";
import {
  blockedReposTableQuery,
  skillsTableQuery,
} from "@/lib/auditor/table-queries";

export const metadata: Metadata = {
  title: "Skills y repositorios · Auditor de skills",
};

interface AdminSkillsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function AdminSkillsPage({
  searchParams,
}: AdminSkillsPageProps) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((await getAdminAccess(session)) !== "admin") redirect("/dashboard");

  const rawParams = await searchParams;
  const view = rawParams.view === "repos" ? "repos" : "skills";
  const cookieStore = await cookies();

  if (view === "repos") {
    const hiddenColumns = readHiddenColumns(
      cookieStore.get(getColumnsCookieName("auditor-blocked-repos"))?.value,
    );
    const params = blockedReposTableQuery.parse(rawParams);
    const result = await getBlockedRepos(params);

    if (result.page !== params.page) {
      const qs = blockedReposTableQuery.toQueryString({
        ...params,
        page: result.page,
      });
      redirect(`/dashboard/auditor/skills?view=repos&${qs}`);
    }

    return (
      <ModerationContent
        view="repos"
        repos={result.rows}
        total={result.total}
        totalPages={result.totalPages}
        params={params}
        hiddenColumns={hiddenColumns}
      />
    );
  }

  const hiddenColumns = readHiddenColumns(
    cookieStore.get(getColumnsCookieName("auditor-skills"))?.value,
  );
  const params = skillsTableQuery.parse(rawParams);
  const result = await getSkills(params);

  if (result.page !== params.page) {
    const qs = skillsTableQuery.toQueryString({
      ...params,
      page: result.page,
    });
    redirect(`/dashboard/auditor/skills?${qs}`);
  }

  return (
    <ModerationContent
      view="skills"
      skills={result.rows}
      total={result.total}
      totalPages={result.totalPages}
      params={params}
      hiddenColumns={hiddenColumns}
    />
  );
}
