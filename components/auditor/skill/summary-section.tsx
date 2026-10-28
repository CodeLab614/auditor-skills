import Link from "next/link";
import {
  Ban,
  CircleCheck,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/auditor/ui/button";
import { Panel } from "@/components/auditor/ui/panel";
import { PanelGrid } from "@/components/auditor/ui/panel-grid";
import { Chip } from "@/components/auditor/ui/chip";
import { InlineLink } from "@/components/auditor/ui/inline-link";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { formatDate, severityLabel, verdictLabel } from "@/lib/auditor/labels";
import { analysisHref } from "@/lib/auditor/skill-links";
import type { Severity, SkillAnalysis } from "@/lib/auditor/types";

const severityTone = {
  critical: "critical", high: "high", medium: "medium", low: "low",
} as const;

const verdictAction = {
  dangerous: "No la instales.",
  review: "Revísala antes de instalarla.",
  "no-serious-findings": "No encontramos nada grave.",
} as const;

const verdictIcon = {
  dangerous: ShieldAlert,
  review: ShieldQuestion,
  "no-serious-findings": ShieldCheck,
} as const;

const actionIcon = {
  dangerous: Ban,
  review: TriangleAlert,
  "no-serious-findings": CircleCheck,
} as const;

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function SummarySection({
  analysis,
  onOpenFile,
}: {
  analysis: SkillAnalysis;
  onOpenFile: (path: string, line?: number) => void;
}) {
  const counts: Severity[] = ["critical", "high", "medium", "low"];
  const explained = analysis.steps.find((step) => step.label === "Explicación");
  const rules = analysis.steps.find((step) => step.label === "Reglas");
  const isolated = analysis.steps.find((step) => step.label === "Ejecución aislada");
  const reviewedPct = analysis.coverage.sourcePct + analysis.coverage.decompiledPct;
  const coverageSentence = analysis.coverage.unreviewablePct
    ? `Se leyó el ${reviewedPct} % del código; el ${analysis.coverage.unreviewablePct} % ` +
      "son archivos que no se pudieron revisar."
    : `Se leyó el ${reviewedPct} % del código disponible.`;
  const hasUnexecutedShellScript = analysis.notExecuted.some((item) =>
    item.path.endsWith(".sh"));
  const isolatedSentence = isolated && hasUnexecutedShellScript
    ? `Se ejecutaron ${isolated.done} de ${isolated.total} scripts en una máquina aislada.`
    : isolated
      ? `La ejecución aislada completó ${isolated.done} de ${isolated.total} pasos.`
    : "No hay pasos de ejecución aislada registrados.";
  const criticalCount = analysis.findings.filter(
    (finding) => finding.severity === "critical",
  ).length;
  const topFinding = analysis.findings.find(
    (finding) => finding.id === analysis.topFindingId,
  ) ?? analysis.findings.toSorted((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity],
  )[0];
  const VerdictIcon = verdictIcon[analysis.verdict];
  const ActionIcon = actionIcon[analysis.verdict];
  const analyzedAt = analysis.versions.find(
    (version) => version.number === analysis.version,
  )?.analyzedAt;
  const isolatedCount = isolated ? `${isolated.done} de ${isolated.total}` : "—";

  return (
    <section id="report-0" className="auditor-report-section scroll-mt-36">
      <SectionHeader label="Informe de análisis" title="Resumen" />
      <PanelGrid columns={2} className="auditor-report-grid auditor-report-grid--summary">
        <Panel
          gridCell
          className={`auditor-verdict-card auditor-verdict-card--${analysis.verdict} md:col-span-2`}
          id="answer"
          data-skill-block
        >
          <div className="auditor-verdict-card__heading">
            <div className="auditor-verdict-card__label">
              <VerdictIcon aria-hidden="true" />
              <h2>{verdictLabel[analysis.verdict]}</h2>
            </div>
            <span className="auditor-verdict-card__meta">
              Versión {analysis.version} · analizada el {analyzedAt ? formatDate(analyzedAt) : ""}
            </span>
          </div>
          <p className="auditor-summary-plain">{analysis.plainSummary}</p>
          <div className="auditor-verdict-action">
            <ActionIcon aria-hidden="true" />
            <strong>{verdictAction[analysis.verdict]}</strong>
          </div>
          <div className="auditor-verdict-stats" aria-label="Cifras clave del análisis">
            <div><span>Avisos</span><strong>{analysis.findings.length}</strong></div>
            <div>
              <span>Críticos</span>
              <strong className={criticalCount > 0 ? "is-critical" : undefined}>
                {criticalCount}
              </strong>
            </div>
            <div><span>No declarados</span><strong>{analysis.undeclaredBehaviors.length}</strong></div>
            <div><span>Scripts ejecutados</span><strong>{isolatedCount}</strong></div>
          </div>
          <div className="auditor-verdict-actions">
            <Button asChild variant="secondary">
              <Link href="#findings">Ver los avisos</Link>
            </Button>
            {topFinding && (
              <InlineLink
                href={analysisHref(analysis.slug, {
                  version: analysis.version,
                  file: topFinding.file,
                  line: topFinding.line,
                })}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey ||
                    event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  onOpenFile(topFinding.file, topFinding.line);
                }}
              >
                Abrir {topFinding.file}:{topFinding.line}
              </InlineLink>
            )}
          </div>
        </Panel>

        <Panel gridCell id="declared-vs-actual" data-skill-block title="Lo que declara">
          {analysis.declares}
        </Panel>
        <Panel gridCell id="actual-behavior" title="Lo que hace realmente">
          <p>{analysis.actuallyDoes}</p>
          {analysis.undeclaredBehaviors.length > 0 && (
            <ul className="auditor-report-list auditor-actual-list">
              {analysis.undeclaredBehaviors.map((behavior) => <li key={behavior}>
                <Chip>No declarado</Chip>
                <span>{behavior}</span>
              </li>)}
            </ul>
          )}
        </Panel>

        <Panel gridCell className="md:col-span-2" id="findings" data-skill-block
          title="Avisos">
          {analysis.findings.length > 0 ? (
            <ul className="auditor-summary-findings">
              {analysis.findings.map((finding) => (
                <li key={finding.id}>
                  <Chip tone={severityTone[finding.severity]}>
                    {severityLabel[finding.severity]}
                  </Chip>
                  <span>{finding.explanation}</span>
                  <InlineLink
                    href={analysisHref(analysis.slug, {
                      version: analysis.version,
                      file: finding.file,
                      line: finding.line,
                    })}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey ||
                        event.altKey || event.button !== 0) return;
                      event.preventDefault();
                      onOpenFile(finding.file, finding.line);
                    }}
                  >
                    {finding.file}:{finding.line}
                  </InlineLink>
                </li>
              ))}
            </ul>
          ) : <p>No se detectaron avisos en esta versión.</p>}
          <p className="auditor-summary-counts">
            {counts.map((severity, index) => <span key={severity}>
              {index > 0 && " · "}
              {severityLabel[severity]} {analysis.findings.filter((finding) =>
                finding.severity === severity).length}
            </span>)}
          </p>
        </Panel>

        <Panel gridCell className="md:col-span-2" id="checked" data-skill-block
          title="Qué se comprobó">
          <p>{coverageSentence}</p>
          {rules && explained && <p>
            Se aplicaron {rules.done} de {rules.total} reglas y se explicaron {explained.done} de {
              explained.total} archivos.
          </p>}
          <p>{isolatedSentence}</p>
          {analysis.notExecuted.length > 0 && (
            <ul className="auditor-report-list">
              {analysis.notExecuted.map((item) => <li key={item.path}>
                <code>{item.path}</code> no se ejecutó: {item.reason}
              </li>)}
            </ul>
          )}
        </Panel>

        <Panel gridCell className="md:col-span-2" id="limits" data-skill-block
          title="Límites del análisis">
          {analysis.notVerifiable.length > 0 && (
            <ul className="auditor-report-list">
              {analysis.notVerifiable.filter((item) =>
                !item.includes("puede detectar que lo observan"))
                .map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          <p>La ejecución aislada muestra cómo se comportó esta versión en ese entorno.
            Una skill puede detectar la observación o actuar distinto en otro entorno.</p>
        </Panel>
      </PanelGrid>
    </section>
  );
}
