import { Chip } from "@/components/auditor/ui/chip";
import { Panel } from "@/components/auditor/ui/panel";
import { PanelGrid } from "@/components/auditor/ui/panel-grid";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import type { SkillAnalysis } from "@/lib/auditor/types";

const statusLabel = { added: "Añadido", removed: "Quitado", modified: "Modificado" } as const;
export function ChangesSection({ analysis }: { analysis: SkillAnalysis }) {
  return (
    <section id="report-4" className="auditor-report-section scroll-mt-36">
      <SectionHeader label="Evolución" title="Cambios frente a la versión anterior" />
      {analysis.changes?.length ? <PanelGrid columns={2} className="auditor-report-grid">
        {analysis.changes.map((change, index) => (
        <Panel gridCell className="md:col-span-2" id={`change-${index}`} data-skill-block key={change.path}>
          <div className="auditor-chip-row">
            <code>{change.path}</code>
            <Chip>{statusLabel[change.status]}</Chip>
            {change.sensitive && <Chip tone="critical">Cambio sensible</Chip>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <p>{change.explanation}</p>
            {change.diff === null ? <p>La versión anterior ya no está en GitHub.</p> : (
              <pre className="auditor-code-panel"><code>{change.diff.map((line, index) =>
                <span className="auditor-diff-line" key={index}>{index + 1} {line}{"\n"}</span>)}</code></pre>
            )}
          </div>
        </Panel>
      ))}</PanelGrid> : <Panel id="no-changes" data-skill-block title="Sin versión anterior">
        Esta es la primera versión analizada de esta skill.
      </Panel>}
    </section>
  );
}
