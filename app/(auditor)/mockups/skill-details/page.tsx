import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillDetailsContent } from "@/components/auditor/skill/skill-details-content";
import {
  getMockSkillAi,
  getMockSkillDetailsView,
} from "@/lib/auditor/mock-skill-details";
import { getSkillDetailsFromDb } from "@/lib/auditor/queries";

export const metadata: Metadata = {
  title: "explicar-cambios · Ficha (maqueta) · Auditor de skills",
};

export default async function MockupFichaPage() {
  const slug = "explicar-cambios";
  const details =
    (await getSkillDetailsFromDb(slug)) ?? (await getMockSkillDetailsView(slug));

  if (!details) {
    notFound();
  }

  const ai = getMockSkillAi(slug);

  return (
    <SkillDetailsContent
      details={details}
      ai={ai}
      showCommentsPlaceholder
    />
  );
}
