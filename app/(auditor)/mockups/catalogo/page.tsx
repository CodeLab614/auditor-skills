import type { Metadata } from "next";
import type { RawSearchParams } from "@/lib/table-query";
import { catalogQuery, queryMockCatalog } from "@/lib/auditor/mock-catalog";
import { CatalogMockContent } from "@/components/auditor/catalog-mock-content";

export const metadata: Metadata = {
  title: "Catálogo (maqueta) · Auditor de skills",
};

interface MockupCatalogPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function MockupCatalogPage({
  searchParams,
}: MockupCatalogPageProps) {
  const rawParams = await searchParams;
  const params = catalogQuery.parse(rawParams);
  const {
    rows,
    total,
    catalogTotal,
    totalPages,
    page,
    verdictCounts,
    remoteCounts,
  } = queryMockCatalog(params);

  return (
    <CatalogMockContent
      rows={rows}
      total={total}
      catalogTotal={catalogTotal}
      totalPages={totalPages}
      page={page}
      verdictCounts={verdictCounts}
      remoteCounts={remoteCounts}
      params={params}
    />
  );
}
