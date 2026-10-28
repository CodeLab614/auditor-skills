import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getTakedownRequests } from "@/lib/auditor/mock-data";
import { TakedownsContent } from "@/components/auditor/admin/takedowns-content";
import { getColumnsCookieName, readHiddenColumns } from "@/lib/table-columns";
import type { RawSearchParams } from "@/lib/table-query";
import {
  claimsTableQuery,
  filterTakedowns,
} from "@/lib/auditor/table-queries";

export const metadata: Metadata = {
  title: "Reclamaciones · Auditor de skills",
};

interface TakedownsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function TakedownsPage({
  searchParams,
}: TakedownsPageProps) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((await getAdminAccess(session)) !== "admin") redirect("/dashboard");

  const cookieStore = await cookies();
  const hiddenColumns = readHiddenColumns(
    cookieStore.get(getColumnsCookieName("auditor-claims"))?.value,
  );

  const rawParams = await searchParams;
  const params = claimsTableQuery.parse(rawParams);
  const allRequests = await getTakedownRequests();
  const result = filterTakedowns(allRequests, params);

  if (result.page !== params.page) {
    redirect(
      `/dashboard/auditor/claims?${claimsTableQuery.toQueryString({
        ...params,
        page: result.page,
      })}`,
    );
  }

  return (
    <TakedownsContent
      requests={result.rows}
      total={result.total}
      totalPages={result.totalPages}
      params={params}
      hiddenColumns={hiddenColumns}
    />
  );
}
