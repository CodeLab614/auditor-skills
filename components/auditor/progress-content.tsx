"use client";

import Link from "next/link";
import {
  Clock3,
  CircleCheck,
  CircleX,
  LoaderCircle,
  PauseCircle,
  SearchCheck,
} from "lucide-react";
import { Button } from "@/components/auditor/ui/button";
import { Panel } from "@/components/auditor/ui/panel";
import { Chip } from "@/components/auditor/ui/chip";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { jobStateLabel } from "@/lib/auditor/labels";
import { PageShell } from "@/components/auditor/page-shell";
import type { AnalysisProgress } from "@/lib/auditor/types";

const icon = {
  queued: Clock3,
  checking: SearchCheck,
  running: LoaderCircle,
  paused: PauseCircle,
  done: CircleCheck,
  failed: CircleX,
};
export function ProgressContent({ progress }: { progress: AnalysisProgress }) {
  const StateIcon = icon[progress.state];
  const minutes = Math.floor(progress.elapsedSeconds / 60);
  return (
    <PageShell className="auditor-progress-shell">
    <div className="mx-auto py-8">
      <SectionHeader label="Avance del análisis" title="Estado del análisis" />
      <Panel className="auditor-progress-card">
          <div className="auditor-progress-heading">
            <StateIcon
              className={`size-6 ${progress.state === "running" ? "animate-spin" : ""}`}
            />
            <div>
              <p className="text-sm text-muted-foreground">{progress.repo}</p>
            </div>
            <Chip className="ml-auto" tone={progress.state === "failed" ? "critical" : "neutral"}>
              {jobStateLabel[progress.state]}
            </Chip>
          </div>
        <div className="auditor-progress-details">
          <p className="text-sm">
            {progress.state === "checking"
              ? "Comprobando…"
              : (progress.step ?? jobStateLabel[progress.state])}
          </p>
          {progress.fileTotal && (
            <div className="auditor-progress-meter">
              <div className="flex justify-between text-sm">
                <span>Explicación por líneas</span>
                <span>
                  Archivo {progress.fileIndex} de {progress.fileTotal}
                </span>
              </div>
              <div className="auditor-meter-track"><span style={{
                width: `${((progress.fileIndex ?? 0) / progress.fileTotal) * 100}%`,
              }} /></div>
            </div>
          )}
          {progress.state === "paused" && (
            <p className="auditor-inline-alert auditor-inline-alert--warning">
              En pausa por cupo de la plataforma. El análisis seguirá cuando
              haya cupo disponible.
            </p>
          )}
          {progress.state === "failed" && (
            <p className="auditor-inline-alert auditor-inline-alert--danger">
              {progress.failureReason}
            </p>
          )}
          {progress.state === "done" && progress.resultSlug && (
            <Button asChild>
              <Link href={`/skills/${progress.resultSlug}`}>Ver análisis</Link>
            </Button>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Tiempo transcurrido: {minutes > 0 ? `${minutes} min ` : ""}
            {progress.elapsedSeconds % 60} s
          </p>
        </div>
      </Panel>
    </div>
    </PageShell>
  );
}
