import type { Metadata } from "next";
import { Mail, ShieldCheck } from "lucide-react";
import { Text } from "@/components/auditor/ui/text";
import { Panel } from "@/components/auditor/ui/panel";
import { PanelGrid } from "@/components/auditor/ui/panel-grid";
import { InlineLink } from "@/components/auditor/ui/inline-link";
import { PageShell } from "@/components/auditor/page-shell";
import { SectionHeader } from "@/components/auditor/ui/section-header";

export const metadata: Metadata = {
  title: "Solicitudes de retirada · Auditor de skills",
};

export default function TakedownInfoPage() {
  return (
    <PageShell className="auditor-info-shell">
    <article className="auditor-info-page space-y-6 py-8">
      <div>
        <SectionHeader as="h1" label="Información para autores" title={
          <>Solicitudes de <span className="auditor-highlight">retirada</span></>
        } />
        <Text className="mt-3 text-left">
          Puedes informar de un error en el análisis o solicitar que revisemos
          una skill del catálogo.
        </Text>
      </div>
      <PanelGrid columns={2} className="auditor-report-grid">
      <Panel gridCell title={<><ShieldCheck className="size-5" /> Cómo enviar una solicitud</>}>
        <div className="auditor-panel-copy">
          <p>
            Abre la página de la skill y selecciona «Soy el autor / reportar un
            error». Inicia sesión y describe el motivo con la ruta y los
            detalles que permitan revisar la solicitud.
          </p>
          <p>
            Si no puedes usar el formulario, escribe a{" "}
            <InlineLink href="mailto:retiradas@ejemplo.invalid">
              retiradas@ejemplo.invalid
            </InlineLink>
            .
          </p>
        </div>
      </Panel>
      <Panel gridCell title="Qué ocurre después">
        <div className="auditor-panel-copy">
          <p>
            La solicitud se revisa en el panel de administración. Las
            reclamaciones de autores vinculados públicamente al repositorio
            muestran la etiqueta «Autor verificado»; las demás aparecen como
            «Sin verificar» y también se revisan.
          </p>
          <p>
            El equipo puede ocultar la skill del catálogo, bloquear el
            repositorio, pedir un reanálisis o rechazar la solicitud con un
            motivo. No se borra el análisis conservado.
          </p>
        </div>
      </Panel>
      </PanelGrid>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="size-4" />
        Incluye el enlace del repositorio y la versión del análisis.
      </p>
    </article>
    </PageShell>
  );
}
