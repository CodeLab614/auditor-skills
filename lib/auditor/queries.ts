import { prisma } from "@/lib/prisma";
import { queryCatalog, queryHomeStats } from "@/lib/auditor/catalog";
import type { CatalogFilter } from "@/lib/auditor/catalog-query";
import { currentCreditMonth, nextRenewal, SUBMISSION_LIMITS } from "@/lib/auditor/limits";
import { mapJobState } from "@/lib/auditor/job-state";
import { analysisStepLabel } from "@/lib/auditor/labels";
import {
  toSkillAnalysis,
  type ToSkillInput,
  type ToVersionFileInput,
  type ToFindingInput,
  type ToVersionInput,
} from "@/lib/auditor/skill-analysis";
import {
  displayLanguage,
  toSkillDetailsView,
  type SkillDetailsView,
} from "@/lib/auditor/skill-details";
import type { TableParams } from "@/lib/table-query";
import {
  buildBlockedReposWhere,
  buildQueueWhere,
  buildSkillsWhere,
  buildSubmissionsWhere,
  type BlockedReposTableFilter,
  type QueueTableFilter,
  type SkillsTableFilter,
  type SubmissionsTableFilter,
} from "@/lib/auditor/table-queries";
import type {
  AdminJob,
  AnalysisProgress,
  BlockedRepo,
  ModeratedSkill,
  Quota,
  SkillAnalysis,
  Submission,
  Verdict,
} from "@/lib/auditor/types";

export {
  toSkillAnalysis,
  type ToSkillInput,
  type ToVersionFileInput,
  type ToFindingInput,
  type ToVersionInput,
};

export async function getSkillAnalysisFromDb(
  slug: string,
  version?: number,
): Promise<SkillAnalysis | null> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    include: {
      versions: {
        where: {
          verdict: { not: null },
          analyzedAt: { not: null },
        },
        orderBy: { analyzedAt: "asc" },
        include: {
          files: { orderBy: { path: "asc" } },
          findings: true,
        },
      },
    },
  });

  if (!skill || skill.hiddenAt) return null;

  return toSkillAnalysis(skill, skill.versions, version);
}

export async function getSkillDetailsFromDb(
  slug: string,
): Promise<SkillDetailsView | null> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
  });

  if (!skill || skill.hiddenAt !== null || !skill.latestVersionId) {
    return null;
  }

  const version = await prisma.skillVersion.findUnique({
    where: { id: skill.latestVersionId },
    include: {
      files: {
        select: { path: true, language: true, lineCount: true },
        orderBy: { path: "asc" },
      },
      findings: {
        select: {
          ruleId: true,
          category: true,
          title: true,
          evidence: true,
          filePath: true,
          line: true,
        },
      },
    },
  });

  if (!version || !version.verdict || !version.analyzedAt) {
    return null;
  }

  const files = version.files.map((file) => ({
    path: file.path,
    language: displayLanguage(file.path, file.language),
    lineCount: file.lineCount,
  }));

  return toSkillDetailsView({
    skill: {
      slug: skill.slug,
      name: skill.name,
      owner: skill.displayOwner ?? skill.owner,
      repo: skill.displayRepo ?? skill.repo,
      path: skill.path,
      description: skill.description,
    },
    version: {
      verdict: version.verdict,
      analyzedAt: version.analyzedAt.toISOString(),
    },
    files,
    findings: version.findings,
  });
}

export async function getQuota(userId: string): Promise<Quota> {
  const used = await prisma.analysisJob.count({
    where: {
      userId,
      creditMonth: currentCreditMonth(),
      creditReturnedAt: null,
    },
  });

  return {
    used,
    limit: SUBMISSION_LIMITS.monthlyAnalyses,
    renewsOn: nextRenewal().toISOString(),
  };
}

export async function getMySubmissions(
  userId: string,
  params: TableParams<SubmissionsTableFilter>,
): Promise<{
  rows: Submission[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const where = buildSubmissionsWhere(userId, params);

  const [total, jobs] = await prisma.$transaction([
    prisma.analysisJob.count({ where }),
    prisma.analysisJob.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { version: { include: { skill: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);

  const rows: Submission[] = jobs.map((job) => {
    const state = mapJobState(job.status, job.kind);
    const resultSlug = state === "done" ? job.version.skill.slug : undefined;
    const skill = job.version.skill;
    const repo = `${skill.displayOwner ?? skill.owner}/${skill.displayRepo ?? skill.repo}`;

    return {
      id: job.id,
      progressId:
        state === "queued" || state === "checking" || state === "running"
          ? job.id
          : undefined,
      skillName: skill.name,
      repo,
      submittedAt: job.createdAt.toISOString(),
      state,
      ...(resultSlug ? { resultSlug } : {}),
      ...(job.failureReason ? { failureReason: job.failureReason } : {}),
    };
  });

  return { rows, total, totalPages, page };
}

export async function getAdminJobs(
  params: TableParams<QueueTableFilter>,
): Promise<{
  rows: AdminJob[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const where = buildQueueWhere(params);

  const [total, jobs] = await prisma.$transaction([
    prisma.analysisJob.count({ where }),
    prisma.analysisJob.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: { select: { name: true, email: true } },
        version: { include: { skill: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);

  const rows: AdminJob[] = jobs.map((job) => {
    const skill = job.version.skill;
    const repo = `${skill.displayOwner ?? skill.owner}/${skill.displayRepo ?? skill.repo}`;
    const state = mapJobState(job.status, job.kind);

    return {
      id: job.id,
      skillName: skill.name,
      repo,
      submittedBy: job.user?.name || job.user?.email || "Usuario eliminado",
      state,
      kind: job.kind,
      attempts: job.attempts,
      createdAt: job.createdAt.toISOString(),
      progressId:
        state === "queued" || state === "checking" || state === "running"
          ? job.id
          : undefined,
      resultSlug: state === "done" ? skill.slug : undefined,
      ...(job.failureReason ? { failureReason: job.failureReason } : {}),
    };
  });

  return { rows, total, totalPages, page };
}

export async function getSkills(
  params: TableParams<SkillsTableFilter>,
): Promise<{
  rows: ModeratedSkill[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const where = buildSkillsWhere(params);

  const [total, skills] = await prisma.$transaction([
    prisma.skill.count({ where }),
    prisma.skill.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        versions: {
          select: {
            verdict: true,
            analyzedAt: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);

  const rows: ModeratedSkill[] = skills.map((skill) => {
    const repo = `${skill.displayOwner ?? skill.owner}/${skill.displayRepo ?? skill.repo}`;
    const analyzedVersions = skill.versions.filter((v) => v.verdict !== null).length;

    const versionsWithVerdict = skill.versions.filter((v) => v.verdict !== null);
    const latestVersion = versionsWithVerdict.sort((a, b) => {
      const timeA = a.analyzedAt ? a.analyzedAt.getTime() : 0;
      const timeB = b.analyzedAt ? b.analyzedAt.getTime() : 0;
      return timeB - timeA;
    })[0];

    const rawVerdict = latestVersion?.verdict;
    const latestVerdict: Verdict | null = rawVerdict
      ? (rawVerdict.replaceAll("_", "-") as Verdict)
      : null;

    return {
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      repo,
      path: skill.path,
      hidden: skill.hiddenAt !== null,
      hiddenAt: skill.hiddenAt ? skill.hiddenAt.toISOString() : null,
      analyzedVersions,
      latestVerdict,
      createdAt: skill.createdAt.toISOString(),
    };
  });

  return { rows, total, totalPages, page };
}

export async function getBlockedRepos(
  params: TableParams<BlockedReposTableFilter>,
): Promise<{
  rows: BlockedRepo[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const where = buildBlockedReposWhere(params);

  const [total, repos] = await prisma.$transaction([
    prisma.blockedRepository.count({ where }),
    prisma.blockedRepository.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);

  const rows: BlockedRepo[] = repos.map((item) => ({
    id: item.id,
    repo: `${item.owner}/${item.repo}`,
    blockedAt: item.createdAt.toISOString(),
    reason: item.reason,
    blockedBy: item.createdBy?.name || item.createdBy?.email || "—",
  }));

  return { rows, total, totalPages, page };
}

export async function getAnalysisProgress(id: string): Promise<AnalysisProgress | null> {
  const job = await prisma.analysisJob.findUnique({
    where: { id },
    include: { version: { include: { skill: true } } },
  });
  if (!job) return null;

  const state = mapJobState(job.status, job.kind);
  const startedAt = job.startedAt ?? job.createdAt;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));

  const skill = job.version.skill;
  const repo = `${skill.displayOwner ?? skill.owner}/${skill.displayRepo ?? skill.repo}`;

  let step: string | undefined;
  if (state === "checking") {
    step = "Comprobando…";
  } else if (job.step && job.step in analysisStepLabel) {
    step = analysisStepLabel[job.step];
  }

  const isRules = job.step === "rules";
  const fileIndex = isRules ? (job.progressCurrent ?? undefined) : undefined;
  const fileTotal = isRules ? (job.progressTotal ?? undefined) : undefined;

  return {
    id: job.id,
    skillName: skill.name,
    repo,
    state,
    ...(step ? { step } : {}),
    ...(fileIndex !== undefined ? { fileIndex } : {}),
    ...(fileTotal !== undefined ? { fileTotal } : {}),
    elapsedSeconds,
    ...(job.failureReason ? { failureReason: job.failureReason } : {}),
    ...(state === "done" ? { resultSlug: skill.slug } : {}),
  };
}

export function getCatalogPage(params: TableParams<CatalogFilter>) {
  return queryCatalog(prisma, params);
}

export function getHomeStats() {
  return queryHomeStats(prisma);
}


