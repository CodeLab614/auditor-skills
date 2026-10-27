import type { Prisma } from "@prisma/client";
import { defineTableQuery, type TableParams } from "@/lib/table-query";
import type { TakedownRequest } from "@/lib/auditor/types";

// ============================================
// COMMON JOB HELPERS
// ============================================

export const JOB_STATUSES = [
  "queued",
  "checking",
  "running",
  "done",
  "failed",
] as const;

export type JobStatusFilter = (typeof JOB_STATUSES)[number];

export function buildJobStatusConditions(
  statuses: readonly string[],
): Prisma.AnalysisJobWhereInput[] {
  const conditions: Prisma.AnalysisJobWhereInput[] = [];

  for (const status of statuses) {
    if (status === "queued") {
      conditions.push({ status: "queued", kind: "analysis" });
    } else if (status === "checking") {
      conditions.push({ status: "queued", kind: "fingerprint_check" });
    } else if (status === "running") {
      conditions.push({ status: "running" });
    } else if (status === "done") {
      conditions.push({ status: "done" });
    } else if (status === "failed") {
      conditions.push({ status: "failed" });
    }
  }

  return conditions;
}

// ============================================
// 1. SUBMISSIONS (Mis envíos)
// ============================================

export type SubmissionsTableFilter = "status";

export const submissionsTableQuery = defineTableQuery<SubmissionsTableFilter>({
  searchMaxLength: 100,
  filters: {
    status: { param: "status", values: JOB_STATUSES, multiple: true },
  },
});

export function buildSubmissionsWhere(
  userId: string,
  params: TableParams<SubmissionsTableFilter>,
): Prisma.AnalysisJobWhereInput {
  const conditions: Prisma.AnalysisJobWhereInput[] = [{ userId }];

  if (params.q) {
    conditions.push({
      version: {
        skill: {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { owner: { contains: params.q, mode: "insensitive" } },
            { repo: { contains: params.q, mode: "insensitive" } },
            { displayOwner: { contains: params.q, mode: "insensitive" } },
            { displayRepo: { contains: params.q, mode: "insensitive" } },
          ],
        },
      },
    });
  }

  if (params.filters.status.length > 0) {
    const statusConditions = buildJobStatusConditions(params.filters.status);
    if (statusConditions.length > 0) {
      conditions.push({ OR: statusConditions });
    }
  }

  return { AND: conditions };
}

// ============================================
// 2. QUEUE (Cola de análisis)
// ============================================

export const QUEUE_JOB_KINDS = ["analysis", "fingerprint_check"] as const;
export type QueueJobKindFilter = (typeof QUEUE_JOB_KINDS)[number];

export type QueueTableFilter = "status" | "kind";

export const queueTableQuery = defineTableQuery<QueueTableFilter>({
  searchMaxLength: 100,
  filters: {
    status: { param: "status", values: JOB_STATUSES, multiple: true },
    kind: { param: "kind", values: QUEUE_JOB_KINDS, multiple: true },
  },
});

export function buildQueueWhere(
  params: TableParams<QueueTableFilter>,
): Prisma.AnalysisJobWhereInput {
  const conditions: Prisma.AnalysisJobWhereInput[] = [];

  if (params.q) {
    conditions.push({
      OR: [
        { version: { skill: { name: { contains: params.q, mode: "insensitive" } } } },
        { version: { skill: { owner: { contains: params.q, mode: "insensitive" } } } },
        { version: { skill: { repo: { contains: params.q, mode: "insensitive" } } } },
        { version: { skill: { displayOwner: { contains: params.q, mode: "insensitive" } } } },
        { version: { skill: { displayRepo: { contains: params.q, mode: "insensitive" } } } },
        { user: { name: { contains: params.q, mode: "insensitive" } } },
        { user: { email: { contains: params.q, mode: "insensitive" } } },
      ],
    });
  }

  if (params.filters.status.length > 0) {
    const statusConditions = buildJobStatusConditions(params.filters.status);
    if (statusConditions.length > 0) {
      conditions.push({ OR: statusConditions });
    }
  }

  if (params.filters.kind.length > 0) {
    conditions.push({
      kind: { in: params.filters.kind as QueueJobKindFilter[] },
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

// ============================================
// 3. SKILLS (Skills del catálogo)
// ============================================

export const SKILL_VISIBILITIES = ["visible", "hidden"] as const;
export type SkillVisibilityFilter = (typeof SKILL_VISIBILITIES)[number];

export type SkillsTableFilter = "visibility";

export const skillsTableQuery = defineTableQuery<SkillsTableFilter>({
  searchMaxLength: 100,
  filters: {
    visibility: {
      param: "visibility",
      values: SKILL_VISIBILITIES,
      multiple: true,
    },
  },
});

export function buildSkillsWhere(
  params: TableParams<SkillsTableFilter>,
): Prisma.SkillWhereInput {
  const conditions: Prisma.SkillWhereInput[] = [];

  if (params.q) {
    conditions.push({
      OR: [
        { name: { contains: params.q, mode: "insensitive" } },
        { owner: { contains: params.q, mode: "insensitive" } },
        { repo: { contains: params.q, mode: "insensitive" } },
        { displayOwner: { contains: params.q, mode: "insensitive" } },
        { displayRepo: { contains: params.q, mode: "insensitive" } },
        { path: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  const { visibility } = params.filters;
  if (visibility.length === 1) {
    if (visibility[0] === "visible") {
      conditions.push({ hiddenAt: null });
    } else if (visibility[0] === "hidden") {
      conditions.push({ hiddenAt: { not: null } });
    }
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

// ============================================
// 4. BLOCKED REPOSITORIES (Repositorios bloqueados)
// ============================================

export type BlockedReposTableFilter = string;

export const blockedReposTableQuery = defineTableQuery<BlockedReposTableFilter>({
  searchMaxLength: 100,
  filters: {},
});

export function buildBlockedReposWhere(
  params: TableParams<BlockedReposTableFilter>,
): Prisma.BlockedRepositoryWhereInput {
  if (params.q) {
    return {
      OR: [
        { owner: { contains: params.q, mode: "insensitive" } },
        { repo: { contains: params.q, mode: "insensitive" } },
        { reason: { contains: params.q, mode: "insensitive" } },
      ],
    };
  }
  return {};
}

// ============================================
// 5. CLAIMS (Reclamaciones)
// ============================================

export const CLAIM_STATUSES = ["pending", "resolved", "rejected"] as const;
export const CLAIM_KINDS = ["error", "takedown", "other"] as const;
export const CLAIM_VERIFICATIONS = ["verified", "unverified"] as const;

export type ClaimsTableFilter = "status" | "kind" | "verified";

export const claimsTableQuery = defineTableQuery<ClaimsTableFilter>({
  searchMaxLength: 100,
  filters: {
    status: { param: "status", values: CLAIM_STATUSES, multiple: true },
    kind: { param: "kind", values: CLAIM_KINDS, multiple: true },
    verified: { param: "verified", values: CLAIM_VERIFICATIONS, multiple: true },
  },
});

export function filterTakedowns(
  requests: readonly TakedownRequest[],
  params: TableParams<ClaimsTableFilter>,
): {
  rows: TakedownRequest[];
  total: number;
  totalPages: number;
  page: number;
} {
  let filtered = [...requests];

  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (req) =>
        req.skillName.toLowerCase().includes(q) ||
        req.requester.toLowerCase().includes(q),
    );
  }

  const { status, kind, verified } = params.filters;

  if (status.length > 0) {
    filtered = filtered.filter((req) => status.includes(req.status));
  }

  if (kind.length > 0) {
    filtered = filtered.filter((req) => kind.includes(req.kind));
  }

  if (verified.length === 1) {
    if (verified[0] === "verified") {
      filtered = filtered.filter((req) => req.verified === true);
    } else if (verified[0] === "unverified") {
      filtered = filtered.filter((req) => req.verified === false);
    }
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);
  const skip = (page - 1) * params.pageSize;
  const rows = filtered.slice(skip, skip + params.pageSize);

  return { rows, total, totalPages, page };
}
