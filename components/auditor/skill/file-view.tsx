import { Chip } from "@/components/auditor/ui/chip";
import { Panel } from "@/components/auditor/ui/panel";
import { formatDate, pluralize, severityLabel } from "@/lib/auditor/labels";
import type { ExplanationRange, Finding, SkillFile } from "@/lib/auditor/types";
import { cn } from "@/lib/utils";
import { EvidenceText } from "./evidence-text";
import { Separator } from "@/components/ui/separator";

function rowsFor(
  file: SkillFile,
): { range?: ExplanationRange; lines: number[] }[] {
  const covered = new Set<number>();
  const rows: { range?: ExplanationRange; lines: number[] }[] =
    file.explanations.map((range) => {
      const lines = Array.from(
        { length: Math.max(0, range.to - range.from + 1) },
        (_, index) => range.from + index,
      );
      lines.forEach((line) => covered.add(line));
      return { range, lines };
    });
  for (let line = 1; line <= file.lines.length; line += 1) {
    if (!covered.has(line)) rows.push({ lines: [line] });
  }
  return rows.sort((a, b) => a.lines[0] - b.lines[0]);
}

function FindingNote({ finding }: { finding: Finding }) {
  return (
    <div className="auditor-editor-notice mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={finding.severity}>
          {severityLabel[finding.severity]} ·{" "}
          {finding.declared ? "Declarado" : "No declarado"}
        </Chip>
        <span className="auditor-editor-label font-mono text-xs text-muted-foreground">
          Línea {finding.line}
        </span>
      </div>
      <p className="auditor-editor-explanation mt-1 leading-relaxed">
        {finding.explanation}
      </p>
      <p className="auditor-editor-code mt-1 p-2 text-xs">
        <EvidenceText text={finding.evidence} />
      </p>
    </div>
  );
}

export function FileView({
  file,
  findings,
  highlightedLine,
}: {
  file: SkillFile;
  findings: Finding[];
  highlightedLine?: number;
}) {
  const rows = rowsFor(file);
  const fileFindings = findings.filter((finding) => finding.file === file.path);
  const mode =
    file.review === "source"
      ? "Revisado en código fuente"
      : file.review === "decompiled"
        ? "Revisado por descompilación"
        : "No revisable";
  const noCode = file.availability !== "available" || file.source === "remote";

  return (
    <Panel className="auditor-file-panel" contentClassName="min-w-0">
      <div className="auditor-file-meta">
        <strong className="font-mono text-foreground">{file.path}</strong> ·{" "}
        {pluralize(file.lines.length, "línea", "líneas")}
        <p className="mt-1">Para qué sirve: {file.purpose}</p>
        <p className="mt-1">{mode}</p>
      </div>
      <Separator />
      {file.availability === "gone" && (
        <div className="auditor-file-warning">
          Código ya no disponible en GitHub.
        </div>
      )}
      {file.availability === "sha-mismatch" && (
        <div className="auditor-file-warning">
          El archivo actual de GitHub no coincide con el analizado.
        </div>
      )}
      {file.source === "remote" && (
        <div className="auditor-file-warning">
          <p className="font-medium">
            Este archivo vive fuera de GitHub y puede haber cambiado desde el
            análisis.
          </p>
          <p>
            Origen:{" "}
            <span className="break-all font-mono">{file.remoteUrl}</span>
          </p>
          <p>
            Descargado el{" "}
            {file.downloadedAt ? formatDate(file.downloadedAt) : ""}
          </p>
        </div>
      )}
      {file.availability === "binary" && (
        <div className="auditor-file-warning">
          {file.review === "decompiled"
            ? "Revisado por descompilación"
            : "No revisable"}
        </div>
      )}
      {noCode ? (
        <div className="flex flex-col gap-3 p-4">
          {rows.map(({ range, lines }) => (
            <div key={range ? `${range.from}-${range.to}` : lines[0]}>
              {range && (
                <p className="auditor-editor-explanation leading-relaxed">
                  {range.text}
                </p>
              )}
              {fileFindings
                .filter((finding) => lines.includes(finding.line))
                .map((finding) => (
                  <FindingNote key={finding.id} finding={finding} />
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="auditor-editor-code divide-y divide-border/60 font-mono text-xs">
          {rows.map(({ range, lines }) => {
            const rowFindings = fileFindings.filter((finding) =>
              lines.includes(finding.line),
            );
            return (
              <div
                key={range ? `${range.from}-${range.to}` : lines[0]}
                className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
              >
                <div className="w-full min-w-0 overflow-x-auto py-1 lg:border-r">
                  {lines.map((number) => {
                    const hasFinding = fileFindings.some(
                      (finding) => finding.line === number,
                    );
                    return (
                      <div
                        id={`L${number}`}
                        key={number}
                        className={`flex h-6 min-w-max leading-6 ${
                          hasFinding ? "bg-amber-500/10" : ""
                        } ${highlightedLine === number ? "animate-pulse bg-primary/20" : ""}`}
                      >
                        <span
                          className={cn(
                            "auditor-editor-line-number w-12 shrink-0 select-none",
                            "pr-3 text-right text-muted-foreground",
                          )}
                        >
                          {number}
                        </span>
                        <code className="whitespace-pre pr-3">
                          {file.lines[number - 1] || " "}
                        </code>
                      </div>
                    );
                  })}
                </div>
                <div
                  className={cn(
                    "min-h-6 w-full min-w-0 self-start border-l-2 border-transparent px-3 py-2",
                    "font-sans text-xs leading-relaxed text-muted-foreground lg:border-l-0",
                  )}
                >
                  {range && (
                    <>
                      <span className="auditor-editor-label font-mono font-medium text-foreground">
                        {range.from === range.to
                          ? `Línea ${range.from} · `
                          : `Líneas ${range.from}–${range.to} · `}
                      </span>
                      {range.text && (
                        <span className="auditor-editor-explanation">
                          {range.text}
                        </span>
                      )}
                    </>
                  )}
                  {rowFindings.map((finding) => (
                    <FindingNote key={finding.id} finding={finding} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
