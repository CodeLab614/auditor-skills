import type { Metadata } from "next";
import type { RawSearchParams } from "@/lib/table-query";
import { catalogQuery, queryMockCatalog } from "@/lib/auditor/mock-catalog";
import { CatalogContent } from "@/components/auditor/catalog-content";

export const metadata: Metadata = {
  title: "Catálogo (maqueta) · Auditor de skills",
};

interface MockupCatalogPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function MockupCatalogPage({
  searchParams,
}: MockupCatalogPageProps) {
  const params = catalogQuery.parse(await searchParams);
  const result = queryMockCatalog(params);

  return (
    <CatalogContent {...result} params={params} basePath="/mockups/catalogo" />
  );
}
