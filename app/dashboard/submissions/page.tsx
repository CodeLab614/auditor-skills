import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SubmissionsContent } from "@/components/auditor/submissions-content";
import { getMySubmissions, getQuota } from "@/lib/auditor/queries";
import { getColumnsCookieName, readHiddenColumns } from "@/lib/table-columns";
import type { RawSearchParams } from "@/lib/table-query";
import { submissionsTableQuery } from "@/lib/auditor/table-queries";

export const metadata: Metadata = {
  title: "Mis envíos · Auditor de skills",
};

interface SubmissionsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function SubmissionsPage({
  searchParams,
}: SubmissionsPageProps) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth/login");

  const cookieStore = await cookies();
  const hiddenColumns = readHiddenColumns(
    cookieStore.get(getColumnsCookieName("auditor-submissions"))?.value,
  );

  const params = submissionsTableQuery.parse(await searchParams);
  const [result, quota] = await Promise.all([
    getMySubmissions(session.user.id, params),
    getQuota(session.user.id),
  ]);

  if (result.page !== params.page) {
    redirect(
      `/dashboard/submissions?${submissionsTableQuery.toQueryString({
        ...params,
        page: result.page,
      })}`,
    );
  }

  return (
    <SubmissionsContent
      submissions={result.rows}
      total={result.total}
      totalPages={result.totalPages}
      params={params}
      quota={quota}
      hiddenColumns={hiddenColumns}
    />
  );
}
