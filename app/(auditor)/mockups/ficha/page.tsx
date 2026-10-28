import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSkillAnalysis } from "@/lib/auditor/mock-data";
import { getMockSkillDetails } from "@/lib/auditor/mock-skill-details";
import { SkillDetailsContent } from "@/components/auditor/skill/skill-details-content";

export const metadata: Metadata = {
  title: "explicar-cambios · Ficha (maqueta) · Auditor de skills",
};

export default async function MockupFichaPage() {
  const analysis = await getSkillAnalysis("explicar-cambios");
  const details = getMockSkillDetails("explicar-cambios");

  if (!analysis || !details) {
    notFound();
  }

  const currentVersion =
    analysis.versions.find((item) => item.number === analysis.version) ??
    analysis.versions.at(-1);

  const analyzedAt = currentVersion?.analyzedAt ?? "2026-10-24";

  return (
    <SkillDetailsContent
      analysis={{
        name: analysis.name,
        owner: analysis.owner,
        repo: analysis.repo,
        verdict: analysis.verdict,
        analyzedAt,
      }}
      details={details}
      otherHref="/skills/explicar-cambios?section=summary"
    />
  );
}
