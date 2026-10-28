"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/auditor/page-shell";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { analysisHref, skillHref } from "@/lib/auditor/skill-links";
import type { SkillAnalysis } from "@/lib/auditor/types";
import { ChangesSection } from "./changes-section";
import { FileView } from "./file-view";
import { FindingsSection } from "./findings-section";
import { InstallSection } from "./install-section";
import { ReportDialog } from "./report-dialog";
import { SandboxSection } from "./sandbox-section";
import { SkillHeader } from "./skill-header";
import { SkillTree } from "./skill-tree";
import { SummarySection } from "./summary-section";

const reportSections = [
  { id: "summary", label: "Resumen" },
  { id: "install", label: "Instalación" },
  { id: "findings", label: "Hallazgos" },
  { id: "sandbox", label: "Ejecución aislada" },
  { id: "changes", label: "Cambios" },
] as const;

type SectionId = (typeof reportSections)[number]["id"];

export function SkillEditor({
  analysis,
  initialFile,
  initialSection,
  initialLine,
  signedIn,
}: {
  analysis: SkillAnalysis;
  initialFile?: string;
  initialSection?: SectionId;
  initialLine?: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const initialItem = initialFile ?? initialSection ?? "summary";
  const [selected, setSelected] = useState(initialItem);
  const [reportOpen, setReportOpen] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(initialLine);
  const [activeBlock, setActiveBlock] = useState("");
  const tocBlocks = useMemo<Array<[string, string]>>(() => {
    if (selected === "summary") return [
      ["answer", "Veredicto"],
      ["declared-vs-actual", "Lo que declara y lo que hace"],
      ["findings", "Avisos"],
      ["checked", "Qué se comprobó"],
      ["limits", "Límites del análisis"],
    ];
    if (selected === "install") return [
      ...analysis.install.map((step, index) => [
        `install-${index}`, step.method === "plugin"
          ? "Como plugin" : step.method === "readme" ? "Desde el README" : "Copiando la carpeta",
      ] as [string, string]),
      ["packages", "Paquetes instalados"],
    ];
    if (selected === "findings") return analysis.findings.length
      ? analysis.findings.map((finding) => [
        `finding-${finding.id}`, finding.title,
      ])
      : [["no-findings", "Sin hallazgos"]];
    if (selected === "sandbox") return [
      ...analysis.sandbox.map((event, index) => [
        `sandbox-${index}`, event.detail,
      ] as [string, string]),
      ["sandbox-limits", "Límites de la ejecución aislada"],
    ];
    if (selected === "changes") return analysis.changes?.length
      ? analysis.changes.map((change, index) => [
        `change-${index}`, change.path,
      ])
      : [["no-changes", "Sin versión anterior"]];
    return [];
  }, [analysis, selected]);

  const openFile = useCallback(
    (path: string, line?: number) => {
      if (!analysis.files.some((file) => file.path === path)) {
        setSelected("install");
        router.replace(
          analysisHref(analysis.slug, {
            version: analysis.version,
            section: "install",
          }),
          { scroll: false },
        );
        return;
      }
      setSelected(path);
      setHighlightedLine(line);
      router.replace(
        analysisHref(analysis.slug, {
          version: analysis.version,
          file: path,
          line,
        }),
        { scroll: false },
      );
    },
    [analysis.files, analysis.slug, analysis.version, router],
  );

  const openSection = (section: SectionId) => {
    setSelected(section);
    router.replace(
      analysisHref(analysis.slug, {
        version: analysis.version,
        section,
      }),
      { scroll: false },
    );
  };

  useEffect(() => {
    const hashLine = window.location.hash.match(/^#L(\d+)$/);
    const line = hashLine ? Number(hashLine[1]) : initialLine;
    if (!line) return;
    window.requestAnimationFrame(() => {
      setHighlightedLine(line);
      document.getElementById(`L${line}`)?.scrollIntoView({ block: "center" });
      window.setTimeout(() => setHighlightedLine(undefined), 1800);
    });
  }, [selected, initialLine]);

  useEffect(() => {
    if (!reportSections.some((section) => section.id === selected)) return;
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-skill-block]"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .toSorted((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveBlock(visible.target.id);
    }, { rootMargin: "-18% 0px -65% 0px", threshold: [0, 0.2, 0.5] });
    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, [selected, tocBlocks]);

  const selectItem = (item: string) => {
    if (reportSections.some((section) => section.id === item)) {
      openSection(item as SectionId);
    } else {
      openFile(item);
    }
  };

  const toc = reportSections.some((section) => section.id === selected) ? (
    <>
      <p className="auditor-mono-label">En esta página</p>
      <nav aria-label="Bloques de la sección abierta">
        {tocBlocks.map(([id, label]) => (
          <NavLink key={id} href={`#${id}`} active={activeBlock === id ||
            (!tocBlocks.some(([blockId]) => blockId === activeBlock) &&
              tocBlocks[0]?.[0] === id)}>
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  ) : undefined;

  return (
    <>
      <PageShell
        left={<SkillTree
            analysis={analysis}
            selected={selected}
            onSelect={selectItem}
            onOpenFile={openFile}
          />}
        right={toc}
        className={`auditor-skill-editor ${
          analysis.files.some((entry) => entry.path === selected) ? "is-file-view" : ""
        }`}
      >
        <SkillHeader
          className="auditor-skill-editor__header"
          name={analysis.name}
          owner={analysis.owner}
          repo={analysis.repo}
          verdict={analysis.verdict}
          analyzedAt={
            analysis.versions.find((v) => v.number === analysis.version)
              ?.analyzedAt ?? ""
          }
          slug={analysis.slug}
          current="analysis"
          otherHref={skillHref(analysis.slug)}
          versions={analysis.versions}
          currentVersion={analysis.version}
          onReport={() => setReportOpen(true)}
        />
          <div className="auditor-skill-main">
            <div className="auditor-report-content">
              {analysis.files.find((entry) => entry.path === selected) ? (
                <FileView
                  file={analysis.files.find((entry) => entry.path === selected)!}
                  findings={analysis.findings}
                  highlightedLine={highlightedLine}
                  owner={analysis.owner}
                  repo={analysis.repo}
                />
              ) : selected === "summary" ? (
                <SummarySection analysis={analysis} onOpenFile={openFile} />
              ) : selected === "install" ? (
                <InstallSection analysis={analysis} />
              ) : selected === "findings" ? (
                <FindingsSection analysis={analysis} onOpenFile={openFile} />
              ) : selected === "sandbox" ? (
                <SandboxSection analysis={analysis} />
              ) : selected === "changes" ? (
                <ChangesSection analysis={analysis} />
              ) : null}
            </div>
          </div>
      </PageShell>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        signedIn={signedIn}
      />
    </>
  );
}
