import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getAdminJobs } from "@/lib/auditor/queries";
import { JobsContent } from "@/components/auditor/admin/jobs-content";
import { getColumnsCookieName, readHiddenColumns } from "@/lib/table-columns";
import type { RawSearchParams } from "@/lib/table-query";
import { queueTableQuery } from "@/lib/auditor/table-queries";

export const metadata: Metadata = {
  title: "Cola de análisis · Auditor de skills",
};

interface JobsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((await getAdminAccess(session)) !== "admin") redirect("/dashboard");

  const cookieStore = await cookies();
  const hiddenColumns = readHiddenColumns(
    cookieStore.get(getColumnsCookieName("auditor-queue"))?.value,
  );

  const params = queueTableQuery.parse(await searchParams);
  const result = await getAdminJobs(params);

  if (result.page !== params.page) {
    redirect(
      `/dashboard/auditor/queue?${queueTableQuery.toQueryString({
        ...params,
        page: result.page,
      })}`,
    );
  }

  return (
    <JobsContent
      jobs={result.rows}
      total={result.total}
      totalPages={result.totalPages}
      params={params}
      hiddenColumns={hiddenColumns}
    />
  );
}
