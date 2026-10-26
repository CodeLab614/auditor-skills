import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgressContent } from "@/components/auditor/progress-content";
import { getAnalysisProgress } from "@/lib/auditor/mock-data";

export const metadata: Metadata = {
  title: "Progreso del análisis · Auditor de skills",
};

export default async function AnalysisProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const progress = await getAnalysisProgress(id);
  if (!progress) notFound();
  return <ProgressContent progress={progress} />;
}
