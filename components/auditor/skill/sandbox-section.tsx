import { Chip } from "@/components/auditor/ui/chip";
import { Panel } from "@/components/auditor/ui/panel";
import { PanelGrid } from "@/components/auditor/ui/panel-grid";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import type { SkillAnalysis } from "@/lib/auditor/types";

const kindLabel = { network: "Red", file: "Archivo", process: "Proceso", package: "Paquete" } as const;
const outcomeLabel = { allowed: "Permitido", sinkholed: "Al sumidero", failed: "No se pudo instalar" } as const;
export function SandboxSection({ analysis }: { analysis: SkillAnalysis }) {
  return (
    <section id="report-3" className="auditor-report-section scroll-mt-36">
      <SectionHeader label="Entorno aislado" title="Ejecución aislada" />
      <PanelGrid columns={2} className="auditor-report-grid">
      {analysis.sandbox.map((event, index) => <Panel gridCell id={`sandbox-${index}`}
        data-skill-block key={`${event.kind}-${index}`}>
        <div className="auditor-event-row">
          <Chip>{kindLabel[event.kind]}</Chip>
          <span>{event.detail}</span>
          <Chip tone={event.outcome === "sinkholed" ? "critical" : "neutral"}>
            {outcomeLabel[event.outcome]}
          </Chip>
        </div>
      </Panel>)}
      <Panel gridCell className="md:col-span-2" id="sandbox-limits" data-skill-block
        title="Límites de la ejecución aislada">
        Un script puede detectar que lo observan y comportarse de otra manera.
        El entorno aislado registra los intentos, pero sus resultados no prueban
        que una skill esté limpia.
      </Panel>
      </PanelGrid>
    </section>
  );
}
