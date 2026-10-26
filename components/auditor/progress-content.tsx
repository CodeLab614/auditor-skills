"use client";

import { startTransition, useEffect, useState } from "react";
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
import { getAnalysisProgressAction } from "@/actions/auditor/progress";

const icon = {
  queued: Clock3,
  checking: SearchCheck,
  running: LoaderCircle,
  paused: PauseCircle,
  done: CircleCheck,
  failed: CircleX,
};
export function ProgressContent({ progress }: { progress: AnalysisProgress }) {
  const [currentProgress, setCurrentProgress] = useState(progress);

  useEffect(() => {
    if (progress.id.startsWith("demo-")) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let inFlight = false;
    const isActive = () =>
      currentProgress.state === "queued" ||
      currentProgress.state === "checking" ||
      currentProgress.state === "running";

    const stopPolling = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
    };
    const poll = async () => {
      if (document.visibilityState !== "visible" || inFlight || !isActive()) return;
      inFlight = true;
      try {
        const result = await getAnalysisProgressAction(progress.id);
        if (result.response === "success" && result.data) {
          setCurrentProgress(result.data);
        }
      } finally {
        inFlight = false;
      }
    };
    const startPolling = () => {
      if (document.visibilityState !== "visible" || !isActive() || interval) return;
      interval = setInterval(() => startTransition(() => void poll()), 2500);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") stopPolling();
      else startPolling();
    };

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [currentProgress.state, progress.id]);

  const progressView = currentProgress;
  const StateIcon = icon[progressView.state];
  const minutes = Math.floor(progressView.elapsedSeconds / 60);
  return (
    <PageShell className="auditor-progress-shell">
    <div className="mx-auto py-8">
      <SectionHeader label="Avance del análisis" title="Estado del análisis" />
      <Panel className="auditor-progress-card">
          <div className="auditor-progress-heading">
            <StateIcon
              className={`size-6 ${progressView.state === "running" ? "animate-spin" : ""}`}
            />
            <div>
              <p className="text-sm text-muted-foreground">{progressView.repo}</p>
            </div>
            <Chip className="ml-auto" tone={progressView.state === "failed" ? "critical" : "neutral"}>
              {jobStateLabel[progressView.state]}
            </Chip>
          </div>
        <div className="auditor-progress-details">
          <p className="text-sm">
            {progressView.state === "checking"
              ? "Comprobando…"
              : (progressView.step ?? jobStateLabel[progressView.state])}
          </p>
          {progressView.fileTotal && (
            <div className="auditor-progress-meter">
              <div className="flex justify-between text-sm">
                <span>Explicación por líneas</span>
                <span>
                  Archivo {progressView.fileIndex} de {progressView.fileTotal}
                </span>
              </div>
              <div className="auditor-meter-track"><span style={{
                width: `${((progressView.fileIndex ?? 0) / progressView.fileTotal) * 100}%`,
              }} /></div>
            </div>
          )}
          {progressView.state === "paused" && (
            <p className="auditor-inline-alert auditor-inline-alert--warning">
              En pausa por cupo de la plataforma. El análisis seguirá cuando
              haya cupo disponible.
            </p>
          )}
          {progressView.state === "failed" && (
            <p className="auditor-inline-alert auditor-inline-alert--danger">
              {progressView.failureReason}
            </p>
          )}
          {progressView.state === "done" && progressView.resultSlug && (
            <Button asChild>
              <Link href={`/skills/${progressView.resultSlug}`}>Ver análisis</Link>
            </Button>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Tiempo transcurrido: {minutes > 0 ? `${minutes} min ` : ""}
            {progressView.elapsedSeconds % 60} s
          </p>
        </div>
      </Panel>
    </div>
    </PageShell>
  );
}
