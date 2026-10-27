import { analysisReportSchema, type AnalysisReport } from "@/lib/auditor/analysis-report";
import type {
  Coverage,
  Finding,
  InstallStep,
  SkillAnalysis,
  SkillFile,
  SkillVersionInfo,
  Verdict,
} from "@/lib/auditor/types";

export interface ToSkillInput {
  name: string;
  slug: string;
  owner: string;
  repo: string;
  displayOwner?: string | null;
  displayRepo?: string | null;
  path: string;
  description: string;
}

export interface ToVersionFileInput {
  path: string;
  origin: "skill" | "plugin" | "readme" | "remote";
  blobSha?: string | null;
  kind: string;
  review: "source" | "decompiled" | "unreviewable";
  remoteUrl?: string | null;
  downloadedAt?: Date | string | null;
}

export interface ToFindingInput {
  id: string;
  ruleId: string;
  category?: string;
  severity: "critical" | "high" | "medium" | "low";
  declared: boolean;
  filePath: string;
  line: number;
  title: string;
  evidence: string;
}

export interface ToVersionInput {
  commitSha: string;
  verdict: "dangerous" | "review" | "no_serious_findings" | null;
  analyzedAt: Date | string | null;
  report: unknown;
  files: ToVersionFileInput[];
  findings: ToFindingInput[];
}

export function toSkillAnalysis(
  skill: ToSkillInput,
  versions: ToVersionInput[],
  selectedNumber?: number,
): SkillAnalysis | null {
  const validVersions: Array<{
    version: ToVersionInput;
    report: AnalysisReport;
    analyzedAtDate: Date;
  }> = [];

  for (const v of versions) {
    if (!v.verdict || !v.analyzedAt) continue;
    const parsed = analysisReportSchema.safeParse(v.report);
    if (!parsed.success) continue;
    const analyzedAtDate = v.analyzedAt instanceof Date ? v.analyzedAt : new Date(v.analyzedAt);
    validVersions.push({
      version: v,
      report: parsed.data,
      analyzedAtDate,
    });
  }

  if (validVersions.length === 0) return null;

  validVersions.sort((a, b) => a.analyzedAtDate.getTime() - b.analyzedAtDate.getTime());

  const versionInfos: SkillVersionInfo[] = validVersions.map((item, index) => ({
    number: index + 1,
    commit: item.version.commitSha,
    analyzedAt: item.analyzedAtDate.toISOString(),
  }));

  let activeIndex = validVersions.length - 1;
  if (selectedNumber !== undefined) {
    const foundIndex = versionInfos.findIndex((info) => info.number === selectedNumber);
    if (foundIndex !== -1) {
      activeIndex = foundIndex;
    }
  }

  const activeEntry = validVersions[activeIndex];
  const activeVersion = activeEntry.version;
  const report = activeEntry.report;
  const currentVersionNumber = versionInfos[activeIndex].number;

  const verdict: Verdict =
    activeVersion.verdict === "no_serious_findings"
      ? "no-serious-findings"
      : (activeVersion.verdict as "dangerous" | "review");

  const severityRank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortedRawFindings = [...activeVersion.findings].sort((a, b) => {
    const sevDiff = (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99);
    if (sevDiff !== 0) return sevDiff;
    if (a.declared !== b.declared) {
      return a.declared ? 1 : -1;
    }
    const pathDiff = a.filePath.localeCompare(b.filePath);
    if (pathDiff !== 0) return pathDiff;
    return a.line - b.line;
  });

  const findings: Finding[] = sortedRawFindings.map((f) => ({
    id: f.id,
    severity: f.severity,
    declared: f.declared,
    origin: "rules",
    file: f.filePath,
    line: f.line,
    title: f.title,
    evidence: f.evidence,
    explanation: "",
  }));

  let topFindingId: string | null = null;
  if (report.topFindingKey) {
    const match = activeVersion.findings.find(
      (f) => `${f.ruleId}:${f.filePath}:${f.line}` === report.topFindingKey,
    );
    if (match) {
      topFindingId = match.id;
    }
  }
  if (!topFindingId && findings.length > 0) {
    topFindingId = findings[0].id;
  }

  const sortedFiles = [...activeVersion.files].sort((a, b) => a.path.localeCompare(b.path));
  const files: SkillFile[] = sortedFiles.map((file) => {
    const source: "github" | "remote" | "plugin" =
      file.origin === "remote"
        ? "remote"
        : file.origin === "plugin"
          ? "plugin"
          : "github";

    const isBinary = file.kind === "binary" || file.kind === "image";
    const availability: "available" | "gone" | "sha-mismatch" | "binary" = isBinary
      ? "binary"
      : "available";

    let downloadedAt: string | undefined;
    if (source === "remote" && file.downloadedAt) {
      downloadedAt =
        file.downloadedAt instanceof Date
          ? file.downloadedAt.toISOString()
          : new Date(file.downloadedAt).toISOString();
    }

    return {
      path: file.path,
      purpose: "Todavía no hay explicación por IA.",
      review: file.review,
      source,
      ...(source === "remote" && file.remoteUrl ? { remoteUrl: file.remoteUrl } : {}),
      ...(downloadedAt ? { downloadedAt } : {}),
      availability,
      lines: [],
      explanations: [],
      ...(file.blobSha ? { blobSha: file.blobSha } : {}),
      commit: activeVersion.commitSha,
    };
  });

  const cov = report.coverage;
  const totalBytes = cov.sourceBytes + cov.decompiledBytes + cov.unreviewableBytes;
  let coverage: Coverage;
  if (totalBytes === 0) {
    coverage = { sourcePct: 100, decompiledPct: 0, unreviewablePct: 0 };
  } else {
    let sourcePct = Math.round((cov.sourceBytes / totalBytes) * 100);
    let decompiledPct = Math.round((cov.decompiledBytes / totalBytes) * 100);
    let unreviewablePct = Math.round((cov.unreviewableBytes / totalBytes) * 100);

    const diff = 100 - (sourcePct + decompiledPct + unreviewablePct);
    if (diff !== 0) {
      if (cov.sourceBytes >= cov.decompiledBytes && cov.sourceBytes >= cov.unreviewableBytes) {
        sourcePct += diff;
      } else if (cov.decompiledBytes >= cov.sourceBytes && cov.decompiledBytes >= cov.unreviewableBytes) {
        decompiledPct += diff;
      } else {
        unreviewablePct += diff;
      }
    }
    coverage = { sourcePct, decompiledPct, unreviewablePct };
  }

  const install: InstallStep[] = report.install.map((step) => ({
    method: step.method,
    command: step.command,
    touches: step.touches,
    matchesDeclared: step.matchesDeclared,
    explanation: "",
  }));

  const dependencySet = new Set<string>();
  for (const dep of report.dependencies) {
    if (dep.version) {
      dependencySet.add(`${dep.name} ${dep.version} (${dep.ecosystem})`);
    } else {
      dependencySet.add(`${dep.name} · sin versión fija (${dep.ecosystem})`);
    }
  }
  const dependencies = Array.from(dependencySet);

  return {
    slug: skill.slug,
    name: skill.name,
    owner: skill.displayOwner ?? skill.owner,
    repo: skill.displayRepo ?? skill.repo,
    path: skill.path,
    versions: versionInfos,
    version: currentVersionNumber,
    verdict,
    topFindingId,
    plainSummary: "Todavía no hay explicación por IA para esta versión.",
    findings,
    files,
    notExecuted: report.notExecuted,
    coverage,
    steps: report.steps,
    notVerifiable: report.notVerifiable,
    declares: skill.description,
    actuallyDoes: "Esta comparación llega con la explicación por IA.",
    differences: [],
    undeclaredBehaviors: [],
    install,
    dependencies,
    sandbox: [],
    changes: null,
    plugin: null,
  };
}
