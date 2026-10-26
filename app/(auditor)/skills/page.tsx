import type { Metadata } from "next";
import { CatalogContent } from "@/components/auditor/catalog-content";
import { getCatalog } from "@/lib/auditor/mock-data";
import type { Verdict } from "@/lib/auditor/types";

type Search = {
  q?: string | string[];
  verdict?: string | string[];
  sort?: string | string[];
};

export const metadata: Metadata = {
  title: "Catálogo · Auditor de skills",
};

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [params, catalog] = await Promise.all([searchParams, getCatalog()]);
  const first = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const verdict = first(params.verdict);
  const allowed: Verdict[] = ["dangerous", "review", "no-serious-findings"];
  return (
    <CatalogContent
      catalog={catalog}
      initialQuery={first(params.q) ?? ""}
      initialVerdict={
        allowed.includes(verdict as Verdict) ? (verdict as Verdict) : "all"
      }
    />
  );
}
