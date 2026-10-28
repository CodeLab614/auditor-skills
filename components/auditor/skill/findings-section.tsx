import { Chip } from "@/components/auditor/ui/chip";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { Panel } from "@/components/auditor/ui/panel";
import { PanelGrid } from "@/components/auditor/ui/panel-grid";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { EvidenceText } from "./evidence-text";
import { severityLabel } from "@/lib/auditor/labels";
import { analysisHref } from "@/lib/auditor/skill-links";
import type { SkillAnalysis } from "@/lib/auditor/types";

const origins = { rules: "Reglas", ai: "IA", binary: "Binario", sandbox: "Ejecución aislada" } as const;
export function FindingsSection({ analysis, onOpenFile }: {
  analysis: SkillAnalysis;
  onOpenFile: (path: string, line?: number) => void;
}) {
  const sorted = analysis.findings.toSorted((a, b) =>
    ["critical", "high", "medium", "low"].indexOf(a.severity) -
    ["critical", "high", "medium", "low"].indexOf(b.severity));
  return (
    <section id="report-2" className="auditor-report-section scroll-mt-36">
      <SectionHeader label="Evidencias" title="Hallazgos" />
      {sorted.length ? <PanelGrid columns={2} className="auditor-report-grid">
        {sorted.map((finding) => (
        <NavLink key={finding.id} bareChildren className="auditor-finding-row"
          href={analysisHref(analysis.slug, {
            version: analysis.version,
            file: finding.file,
            line: finding.line,
          })}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            onOpenFile(finding.file, finding.line);
          }}>
          <Panel gridCell id={`finding-${finding.id}`} data-skill-block>
            <div className="auditor-chip-row">
              <Chip tone={finding.severity}>{severityLabel[finding.severity]}</Chip>
              <Chip tone={finding.declared ? "safe" : "critical"}>
                {finding.declared ? "Declarado" : "No declarado"}
              </Chip>
              <span className="auditor-mono-label">Origen: {origins[finding.origin]}</span>
            </div>
            <h3>{finding.title}</h3>
            <p className="auditor-panel-note">{finding.explanation}</p>
            <span className="auditor-mono-label">{finding.file}:{finding.line}</span>
            <p className="auditor-evidence"><EvidenceText text={finding.evidence} /></p>
          </Panel>
        </NavLink>
      ))}</PanelGrid> : <Panel id="no-findings" data-skill-block title="Sin hallazgos">
        Esta versión no tiene hallazgos registrados.
      </Panel>}
    </section>
  );
}
