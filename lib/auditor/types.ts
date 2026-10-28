export type Verdict = "dangerous" | "review" | "no-serious-findings";
export type Severity = "critical" | "high" | "medium" | "low";
export type FindingOrigin = "rules" | "ai" | "binary" | "sandbox";

export interface Finding {
  id: string;
  severity: Severity;
  declared: boolean;
  origin: FindingOrigin;
  file: string;
  line: number;
  title: string;
  evidence: string;
  explanation: string;
}
export interface ExplanationRange {
  from: number;
  to: number;
  text: string;
  findingId?: string;
}
export interface SkillFile {
  path: string;
  purpose: string;
  review: "source" | "decompiled" | "unreviewable";
  source: "github" | "remote" | "plugin";
  remoteUrl?: string;
  downloadedAt?: string;
  availability: "available" | "gone" | "sha-mismatch" | "binary";
  lines: string[];
  explanations: ExplanationRange[];
  blobSha?: string;
  commit?: string;
}
export interface NotExecutedScript {
  path: string;
  reason: string;
}
export interface Coverage {
  sourcePct: number;
  decompiledPct: number;
  unreviewablePct: number;
}
export interface DoneStep {
  label: string;
  done: number;
  total: number;
}
export interface InstallStep {
  method: "folder" | "plugin" | "readme";
  command: string;
  touches: string;
  matchesDeclared: boolean;
  explanation: string;
}
export interface SandboxEvent {
  kind: "network" | "file" | "process" | "package";
  detail: string;
  outcome: "allowed" | "sinkholed" | "failed";
}
export interface FileChange {
  path: string;
  status: "added" | "removed" | "modified";
  sensitive: boolean;
  explanation: string;
  diff: string[] | null;
}
export interface PluginExtras {
  pluginName: string;
  items: { kind: "hook" | "mcp" | "command" | "agent"; path: string }[];
}
export interface SkillVersionInfo {
  number: number;
  commit: string;
  analyzedAt: string;
  reason?: string;
}
export interface SkillAnalysis {
  slug: string;
  name: string;
  owner: string;
  repo: string;
  path: string;
  versions: SkillVersionInfo[];
  version: number;
  verdict: Verdict;
  topFindingId: string | null;
  plainSummary: string;
  findings: Finding[];
  files: SkillFile[];
  notExecuted: NotExecutedScript[];
  coverage: Coverage;
  steps: DoneStep[];
  notVerifiable: string[];
  declares: string;
  actuallyDoes: string;
  differences: string[];
  undeclaredBehaviors: string[];
  install: InstallStep[];
  dependencies: string[];
  sandbox: SandboxEvent[];
  changes: FileChange[] | null;
  plugin: PluginExtras | null;
}
export interface CatalogEntry {
  slug: string;
  name: string;
  owner: string;
  repo: string;
  path: string;
  verdict: Verdict;
  warnings: number;
  analyzedAt: string;
  versionCount: number;
}
export type JobState =
  "queued" | "checking" | "running" | "paused" | "done" | "failed";
export interface AnalysisProgress {
  id: string;
  skillName: string;
  repo: string;
  state: JobState;
  step?: string;
  fileIndex?: number;
  fileTotal?: number;
  elapsedSeconds: number;
  failureReason?: string;
  resultSlug?: string;
}
export interface Submission {
  id: string;
  progressId?: string;
  skillName: string;
  repo: string;
  submittedAt: string;
  state: JobState;
  resultSlug?: string;
  failureReason?: string;
}
export interface Quota {
  used: number;
  limit: number;
  renewsOn: string;
}
export interface AdminJob {
  id: string;
  skillName: string;
  repo: string;
  submittedBy: string;
  state: JobState;
  attempts: number;
  createdAt: string;
  failureReason?: string;
}
export interface ModeratedSkill {
  slug: string;
  name: string;
  repo: string;
  hidden: boolean;
}
export interface BlockedRepo {
  repo: string;
  blockedAt: string;
  reason: string;
}
export interface TakedownRequest {
  id: string;
  skillSlug: string;
  skillName: string;
  requester: string;
  kind: "error" | "takedown" | "other";
  verified: boolean;
  status: "pending" | "resolved" | "rejected";
  message: string;
  createdAt: string;
}
export interface PlatformLimits {
  monthlyAnalyses: number;
  spendCapUsd: number;
  maxPerSubmission: number;
  maxTotalMb: number;
  maxFiles: number;
  maxFileKb: number;
}
