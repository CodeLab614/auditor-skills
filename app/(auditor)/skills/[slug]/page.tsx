import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillEditor } from "@/components/auditor/skill/skill-editor";
import { getSkillAnalysis } from "@/lib/auditor/mock-data";
import { getSession } from "@/lib/auth";

type Params = {
  v?: string | string[];
  file?: string | string[];
  section?: string | string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const analysis = await getSkillAnalysis(slug);
  return {
    title: analysis
      ? `${analysis.name} · Auditor de skills`
      : "Skill · Auditor de skills",
  };
}

export default async function SkillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Params>;
}) {
  const [{ slug }, query, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const selectedVersion = Number(Array.isArray(query.v) ? query.v[0] : query.v);
  const analysis = await getSkillAnalysis(
    slug,
    Number.isFinite(selectedVersion) && selectedVersion > 0
      ? selectedVersion
      : undefined,
  );
  if (!analysis) notFound();
  const requestedFile = Array.isArray(query.file) ? query.file[0] : query.file;
  const initialFile = analysis.files.some((file) => file.path === requestedFile)
    ? requestedFile
    : undefined;
  const requestedSection = Array.isArray(query.section)
    ? query.section[0]
    : query.section;
  const sections = ["summary", "install", "findings", "sandbox", "changes"];
  const initialSection = sections.includes(requestedSection ?? "")
    ? (requestedSection as "summary" | "install" | "findings" | "sandbox" | "changes")
    : undefined;
  return (
    <SkillEditor
      analysis={analysis}
      initialFile={initialFile}
      initialSection={initialSection}
      signedIn={Boolean(session)}
    />
  );
}
