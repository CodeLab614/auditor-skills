import { Chip } from "@/components/auditor/ui/chip";
import { Panel } from "@/components/auditor/ui/panel";
import { PanelGrid } from "@/components/auditor/ui/panel-grid";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { pluralize } from "@/lib/auditor/labels";
import type { SkillAnalysis } from "@/lib/auditor/types";

export function InstallSection({ analysis }: { analysis: SkillAnalysis }) {
  return (
    <section id="report-1" className="auditor-report-section scroll-mt-36">
      <SectionHeader label="Cómo llega al equipo" title="Instalación" />
      <PanelGrid columns={2} className="auditor-report-grid">
        {analysis.install.map((step, index) => (
          <Panel gridCell id={`install-${index}`} data-skill-block
            key={`${step.method}-${index}`} title={<>
            {step.method === "plugin" ? "Como plugin" : step.method === "readme" ? "Desde el README" : "Copiando la carpeta"}
            <Chip>{step.matchesDeclared ? "Declarado" : "No declarado"}</Chip>
          </>}>
            <pre className="auditor-code-panel"><code>{step.command}</code></pre>
            <p><strong>Lo que toca en el equipo:</strong> {step.touches}</p>
            <p className="auditor-panel-note">{step.explanation}</p>
          </Panel>
        ))}
        <Panel gridCell className="md:col-span-2" id="packages" data-skill-block>
        No se revisó el código de los {pluralize(analysis.dependencies.length, "paquete", "paquetes")}
        que instala; solo se buscaron en la lista de problemas conocidos.
          {analysis.dependencies.length > 0 && <ul className="auditor-dependency-list">
            {analysis.dependencies.map((dependency) => <li key={dependency}>{dependency}</li>)}
          </ul>}
        </Panel>
      </PanelGrid>
    </section>
  );
}
