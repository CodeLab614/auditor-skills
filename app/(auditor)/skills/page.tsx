import type { Metadata } from "next";
import { CatalogContent } from "@/components/auditor/catalog-content";
import { catalogQuery } from "@/lib/auditor/catalog-query";
import { getCatalogPage } from "@/lib/auditor/queries";
import type { RawSearchParams } from "@/lib/table-query";

export const metadata: Metadata = {
  title: "Catálogo · Auditor de skills",
};

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = catalogQuery.parse(await searchParams);
  const result = await getCatalogPage(params);

  return <CatalogContent {...result} params={params} basePath="/skills" />;
}
