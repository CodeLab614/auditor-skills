import type { Metadata } from "next";
import { Text } from "@/components/auditor/ui/text";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { Panel } from "@/components/auditor/ui/panel";
import { PanelGrid } from "@/components/auditor/ui/panel-grid";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { PageShell } from "@/components/auditor/page-shell";

const groups = [
  {
    title: "Catálogo y skills",
    links: [
      ["Catálogo (maqueta, miles de skills)", "/mockups/catalog"],
      ["Ficha de la skill (maqueta)", "/mockups/skill-details"],
      ["Catálogo", "/skills"],
      [
        "Explicar cambios · Resumen",
        "/skills/explicar-cambios?section=summary",
      ],
      [
        "Explicar cambios · archivo con hallazgos",
        "/skills/explicar-cambios?file=scripts%2Fexplain.py#L49",
      ],
      [
        "Explicar cambios · cambios",
        "/skills/explicar-cambios?section=changes",
      ],
      [
        "Sync config · Instalación",
        "/skills/sincronizador?section=install",
      ],
      [
        "Sync config · archivo sync.py",
        "/skills/sincronizador?file=sync.py#L41",
      ],
      ["Sync config · Hallazgos", "/skills/sincronizador?section=findings"],
      [
        "Formatear Markdown · Hallazgos",
        "/skills/formateador?section=findings",
      ],
      [
        "Formatear Markdown · archivo SKILL.md",
        "/skills/formateador?file=SKILL.md",
      ],
    ],
  },
  {
    title: "Envíos y progreso",
    links: [
      ["Enviar una skill", "/dashboard/submit"],
      ["Mis envíos", "/dashboard/submissions"],
      ...[
        "demo-queued",
        "demo-checking",
        "demo-running",
        "demo-paused",
        "demo-failed",
        "demo-done",
      ].map((id) => [`Progreso · ${id}`, `/analysis/${id}`]),
    ],
  },
  {
    title: "Administración y políticas",
    links: [
      ["Cola", "/dashboard/auditor/queue"],
      ["Skills", "/dashboard/auditor/skills"],
      ["Reclamaciones", "/dashboard/auditor/claims"],
      ["Límites", "/dashboard/auditor/limits"],
      ["Retiradas", "/takedowns"],
    ],
  },
];

export const metadata: Metadata = {
  title: "Índice de maquetas · Auditor de skills",
};

export default function MockupIndexPage() {
  return (
    <PageShell className="auditor-mockups-shell">
    <div className="space-y-6 py-8">
      <header>
        <SectionHeader as="h1" label="3 / Revisión visual" title={
          <>Índice de <span className="auditor-highlight">maquetas</span></>
        } />
        <Text className="mt-2 text-left">
          Accesos directos a las pantallas y estados preparados para esta ronda.
        </Text>
      </header>
      <PanelGrid columns={2}>
        {groups.map((group) => (
          <Panel key={group.title} gridCell title={group.title} className="auditor-mockup-group">
            <ul className="auditor-mockup-links flex flex-col text-sm">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <NavLink href={href}>{label}</NavLink>
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </PanelGrid>
    </div>
    </PageShell>
  );
}
