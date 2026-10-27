import { prisma } from "@/lib/prisma";
import { currentCreditMonth, nextRenewal, SUBMISSION_LIMITS } from "@/lib/auditor/limits";
import { mapJobState } from "@/lib/auditor/job-state";
import type {
  AdminJob,
  AnalysisProgress,
  Quota,
  Submission,
} from "@/lib/auditor/types";

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

    return {
      id: job.id,
      progressId: state === "queued" || state === "checking" || state === "running"
        ? job.id
        : undefined,
      skillName: job.version.skill.name,
      repo: `${job.version.skill.owner}/${job.version.skill.repo}`,
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

  return jobs.map((job) => ({
    id: job.id,
    skillName: job.version.skill.name,
    repo: `${job.version.skill.owner}/${job.version.skill.repo}`,
    submittedBy: job.user?.name || job.user?.email || "Usuario eliminado",
    state: mapJobState(job.status, job.kind),
    attempts: job.attempts,
    createdAt: job.createdAt.toISOString(),
    ...(job.failureReason ? { failureReason: job.failureReason } : {}),
  }));
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

  return {
    id: job.id,
    skillName: job.version.skill.name,
    repo: `${job.version.skill.owner}/${job.version.skill.repo}`,
    state,
    step: state === "checking" ? "Comprobando…" : undefined,
    elapsedSeconds,
    ...(job.failureReason ? { failureReason: job.failureReason } : {}),
    ...(state === "done" ? { resultSlug: job.version.skill.slug } : {}),
  };
}
