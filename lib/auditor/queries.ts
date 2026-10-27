import { prisma } from "@/lib/prisma";
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
import type {
  AdminJob,
  AnalysisProgress,
  Quota,
  SkillAnalysis,
  Submission,
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

export async function getMySubmissions(userId: string): Promise<Submission[]> {
  const jobs = await prisma.analysisJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { version: { include: { skill: true } } },
  });

  return jobs.map((job) => {
    const state = mapJobState(job.status, job.kind);
    const resultSlug = state === "done" ? job.version.skill.slug : undefined;
    const skill = job.version.skill;
    const repo = `${skill.displayOwner ?? skill.owner}/${skill.displayRepo ?? skill.repo}`;

    return {
      id: job.id,
      progressId: state === "queued" || state === "checking" || state === "running"
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
}

export async function getAdminJobs(): Promise<AdminJob[]> {
  const jobs = await prisma.analysisJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      version: { include: { skill: true } },
    },
  });

  return jobs.map((job) => {
    const skill = job.version.skill;
    const repo = `${skill.displayOwner ?? skill.owner}/${skill.displayRepo ?? skill.repo}`;

    return {
      id: job.id,
      skillName: skill.name,
      repo,
      submittedBy: job.user?.name || job.user?.email || "Usuario eliminado",
      state: mapJobState(job.status, job.kind),
      attempts: job.attempts,
      createdAt: job.createdAt.toISOString(),
      ...(job.failureReason ? { failureReason: job.failureReason } : {}),
    };
  });
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
