import { redirect } from "next/navigation";
import { analysisHref, legacyAnalysisRedirect } from "@/lib/auditor/skill-links";

export default async function LegacySkillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  redirect(legacyAnalysisRedirect(slug, search) ?? analysisHref(slug));
}
