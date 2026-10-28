import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SkillDetailsContent } from "@/components/auditor/skill/skill-details-content";
import {
  getMockSkillAi,
  getMockSkillDetailsView,
} from "@/lib/auditor/mock-skill-details";
import { getSkillDetailsFromDb } from "@/lib/auditor/queries";
import { legacyAnalysisRedirect } from "@/lib/auditor/skill-links";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const details =
    (await getSkillDetailsFromDb(slug)) ?? (await getMockSkillDetailsView(slug));
  return {
    title: details
      ? `${details.name} · Auditor de skills`
      : "Skill · Auditor de skills",
  };
}

export default async function SkillDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const legacyRedirect = legacyAnalysisRedirect(slug, search);
  if (legacyRedirect) {
    redirect(legacyRedirect);
  }

  const details =
    (await getSkillDetailsFromDb(slug)) ?? (await getMockSkillDetailsView(slug));
  if (!details) {
    notFound();
  }

  const ai = getMockSkillAi(slug);

  return <SkillDetailsContent details={details} ai={ai} />;
}
