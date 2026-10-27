import { Chip } from "@/components/auditor/ui/chip";
import { Panel } from "@/components/auditor/ui/panel";
import { formatDate, pluralize, severityLabel } from "@/lib/auditor/labels";
import type { ExplanationRange, Finding, SkillFile } from "@/lib/auditor/types";
import { cn } from "@/lib/utils";
import { EvidenceText } from "./evidence-text";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useGithubFile } from "./use-github-file";

function rowsFor(
  file: SkillFile,
  lines: string[],
  findings: Finding[],
): { range?: ExplanationRange; lines: number[] }[] {
  const covered = new Set<number>();
  const rows: { range?: ExplanationRange; lines: number[] }[] =
    file.explanations.map((range) => {
      const lineRange = Array.from(
        { length: Math.max(0, range.to - range.from + 1) },
        (_, index) => range.from + index,
      );
      lineRange.forEach((line) => covered.add(line));
      return { range, lines: lineRange };
    });

  for (let line = 1; line <= lines.length; line += 1) {
    if (!covered.has(line)) rows.push({ lines: [line] });
  }

  for (const finding of findings) {
    if (finding.file === file.path && !covered.has(finding.line) && finding.line > lines.length) {
      covered.add(finding.line);
      rows.push({ lines: [finding.line] });
    }
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
  owner,
  repo,
}: {
  file: SkillFile;
  findings: Finding[];
  highlightedLine?: number;
  owner: string;
  repo: string;
}) {
  const { status, lines } = useGithubFile(file, owner, repo);
  const effectiveLines = lines.length > 0 ? lines : file.lines;
  const rows = rowsFor(file, effectiveLines, findings);
  const fileFindings = findings.filter((finding) => finding.file === file.path);
  const mode =
    file.review === "source"
      ? "Revisado en código fuente"
      : file.review === "decompiled"
        ? "Revisado por descompilación"
        : "No revisable";

  const isGone = status === "gone" || file.availability === "gone";
  const isMismatch = status === "sha-mismatch" || file.availability === "sha-mismatch";
  const isError = status === "error";
  const isBinary = file.availability === "binary";
  const isRemote = file.source === "remote";
  const isLoading = status === "loading";
  const noCode = isGone || isMismatch || isError || isBinary || isRemote;

  return (
    <Panel className="auditor-file-panel" contentClassName="min-w-0">
      <div className="auditor-file-meta">
        <strong className="font-mono text-foreground">{file.path}</strong> ·{" "}
        {pluralize(effectiveLines.length, "línea", "líneas")}
        <p className="mt-1">Para qué sirve: {file.purpose}</p>
        <p className="mt-1">{mode}</p>
      </div>
      <Separator />
      {isGone && (
        <div className="auditor-file-warning">
          Código ya no disponible en GitHub.
        </div>
      )}
      {isMismatch && (
        <div className="auditor-file-warning">
          El archivo actual de GitHub no coincide con el analizado.
        </div>
      )}
      {isError && (
        <div className="auditor-file-warning">
          No se pudo cargar el archivo desde GitHub.
        </div>
      )}
      {isRemote && (
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
      {isBinary && (
        <div className="auditor-file-warning">
          {file.review === "decompiled"
            ? "Revisado por descompilación"
            : "No revisable"}
        </div>
      )}
      {isLoading ? (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      ) : noCode ? (
        <div className="flex flex-col gap-3 p-4">
          {rows.map(({ range, lines: rowLines }) => (
            <div key={range ? `${range.from}-${range.to}` : rowLines[0]}>
              {range && (
                <p className="auditor-editor-explanation leading-relaxed">
                  {range.text}
                </p>
              )}
              {fileFindings
                .filter((finding) => rowLines.includes(finding.line))
                .map((finding) => (
                  <FindingNote key={finding.id} finding={finding} />
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="auditor-editor-code divide-y divide-border/60 font-mono text-xs">
          {rows.map(({ range, lines: rowLines }) => {
            const rowFindings = fileFindings.filter((finding) =>
              rowLines.includes(finding.line),
            );
            return (
              <div
                key={range ? `${range.from}-${range.to}` : rowLines[0]}
                className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
              >
                <div className="w-full min-w-0 overflow-x-auto py-1 lg:border-r">
                  {rowLines.map((number) => {
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
                          {effectiveLines[number - 1] || " "}
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
