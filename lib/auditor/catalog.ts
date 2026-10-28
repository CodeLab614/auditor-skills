import { Prisma, type PrismaClient } from "@prisma/client";
import type { TableParams } from "@/lib/table-query";
import type { Verdict } from "@/lib/auditor/types";
import { normalizeSearchText } from "@/lib/auditor/search-text";
import type {
  CatalogFilter,
  CatalogPage,
  CatalogRow,
  HomeStats,
} from "@/lib/auditor/catalog-query";

export const CATALOG_BASE_CONDITION = Prisma.sql`s."hiddenAt" IS NULL AND s."latestVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "blocked_repository" b WHERE lower(b."owner") = lower(s."owner") AND lower(b."repo") = lower(s."repo"))`;

export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

interface CountResult {
  count: bigint | number;
}

interface VerdictCountRow {
  latestVerdict: string | null;
  count: bigint | number;
}

interface RemoteCountRow {
  latestHasRemoteScripts: boolean | null;
  count: bigint | number;
}

interface DbRow {
  slug: string;
  name: string;
  description: string;
  owner: string;
  repo: string;
  latestVerdict: string;
  warnings: number | null;
  analyzedAt: Date | string;
  hasRemoteScripts: boolean | null;
  versionCount: bigint | number;
}

export async function queryCatalog(
  client: { $queryRaw: PrismaClient["$queryRaw"] },
  params: TableParams<CatalogFilter>,
): Promise<CatalogPage> {
  const baseCondition = CATALOG_BASE_CONDITION;

  const n = normalizeSearchText(params.q);
  const searchCondition =
    n.length > 0
      ? Prisma.sql`s."searchText" ILIKE '%' || ${escapeLike(n)} || '%' ESCAPE '\\'`
      : null;

  const rawVerdictFilter = params.filters.verdict[0];
  const dbVerdictFilter = rawVerdictFilter
    ? rawVerdictFilter.replaceAll("-", "_")
    : null;
  const verdictCondition = dbVerdictFilter
    ? Prisma.sql`s."latestVerdict" = ${dbVerdictFilter}::"Verdict"`
    : null;

  const remoteFilter = params.filters.remote[0];
  const remoteCondition =
    remoteFilter === "yes"
      ? Prisma.sql`s."latestHasRemoteScripts" = true`
      : remoteFilter === "no"
        ? Prisma.sql`s."latestHasRemoteScripts" = false`
        : null;

  const catalogTotalWhere = [baseCondition];

  const verdictWhere = [baseCondition];
  if (searchCondition) verdictWhere.push(searchCondition);
  if (remoteCondition) verdictWhere.push(remoteCondition);

  const remoteWhere = [baseCondition];
  if (searchCondition) remoteWhere.push(searchCondition);
  if (verdictCondition) remoteWhere.push(verdictCondition);

  const allWhere = [baseCondition];
  if (searchCondition) allWhere.push(searchCondition);
  if (verdictCondition) allWhere.push(verdictCondition);
  if (remoteCondition) allWhere.push(remoteCondition);

  const [catalogTotalResult, verdictRows, remoteRows, totalResult] =
    await Promise.all([
      client.$queryRaw<CountResult[]>(
        Prisma.sql`SELECT count(*)::bigint AS count FROM "skill" s WHERE ${Prisma.join(catalogTotalWhere, " AND ")}`
      ),
      client.$queryRaw<VerdictCountRow[]>(
        Prisma.sql`
          SELECT s."latestVerdict"::text AS "latestVerdict", count(*)::bigint AS count
          FROM "skill" s
          WHERE ${Prisma.join(verdictWhere, " AND ")}
          GROUP BY s."latestVerdict"
        `
      ),
      client.$queryRaw<RemoteCountRow[]>(
        Prisma.sql`
          SELECT s."latestHasRemoteScripts", count(*)::bigint AS count
          FROM "skill" s
          WHERE ${Prisma.join(remoteWhere, " AND ")}
          GROUP BY s."latestHasRemoteScripts"
        `
      ),
      client.$queryRaw<CountResult[]>(
        Prisma.sql`SELECT count(*)::bigint AS count FROM "skill" s WHERE ${Prisma.join(allWhere, " AND ")}`
      ),
    ]);

  const catalogTotal = Number(catalogTotalResult[0]?.count ?? 0);
  const total = Number(totalResult[0]?.count ?? 0);

  const verdictCounts: Record<Verdict | "all", number> = {
    all: 0,
    dangerous: 0,
    review: 0,
    "no-serious-findings": 0,
  };
  for (const row of verdictRows) {
    if (row.latestVerdict) {
      const v = row.latestVerdict.replaceAll("_", "-") as Verdict;
      if (v in verdictCounts) {
        verdictCounts[v] = Number(row.count);
      }
    }
  }
  verdictCounts.all =
    verdictCounts.dangerous +
    verdictCounts.review +
    verdictCounts["no-serious-findings"];

  const remoteCounts: Record<"all" | "yes" | "no", number> = {
    all: 0,
    yes: 0,
    no: 0,
  };
  for (const row of remoteRows) {
    if (row.latestHasRemoteScripts === true) {
      remoteCounts.yes = Number(row.count);
    } else if (row.latestHasRemoteScripts === false) {
      remoteCounts.no = Number(row.count);
    }
  }
  remoteCounts.all = remoteCounts.yes + remoteCounts.no;

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(Math.max(1, params.page), totalPages);
  const offset = (page - 1) * params.pageSize;
  const limit = params.pageSize;

  const sort = params.filters.sort[0] || "recent";
  let orderBySql: Prisma.Sql;
  if (sort === "name") {
    orderBySql = Prisma.sql`lower(s."name") ASC, s."id" ASC`;
  } else if (sort === "most-warnings") {
    orderBySql = Prisma.sql`s."latestWarningCount" DESC, s."latestAnalyzedAt" DESC, s."id" DESC`;
  } else if (sort === "fewest-warnings") {
    orderBySql = Prisma.sql`s."latestWarningCount" ASC, s."latestAnalyzedAt" DESC, s."id" DESC`;
  } else {
    // "recent" (default)
    orderBySql = Prisma.sql`s."latestAnalyzedAt" DESC, s."id" DESC`;
  }

  let rows: CatalogRow[] = [];
  if (total > 0) {
    const dbRows = await client.$queryRaw<DbRow[]>(
      Prisma.sql`
        SELECT
          s."slug",
          s."name",
          s."description",
          coalesce(s."displayOwner", s."owner") AS "owner",
          coalesce(s."displayRepo", s."repo") AS "repo",
          s."latestVerdict"::text AS "latestVerdict",
          s."latestWarningCount" AS "warnings",
          s."latestAnalyzedAt" AS "analyzedAt",
          s."latestHasRemoteScripts" AS "hasRemoteScripts",
          (
            SELECT count(*)::bigint
            FROM "skill_version" v
            WHERE v."skillId" = s."id"
              AND v."verdict" IS NOT NULL
              AND v."analyzedAt" IS NOT NULL
          ) AS "versionCount"
        FROM "skill" s
        WHERE ${Prisma.join(allWhere, " AND ")}
        ORDER BY ${orderBySql}
        LIMIT ${limit} OFFSET ${offset}
      `
    );

    rows = dbRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      description: row.description,
      owner: row.owner,
      repo: row.repo,
      verdict: row.latestVerdict.replaceAll("_", "-") as Verdict,
      warnings: Number(row.warnings ?? 0),
      analyzedAt:
        row.analyzedAt instanceof Date
          ? row.analyzedAt.toISOString()
          : new Date(row.analyzedAt).toISOString(),
      versionCount: Number(row.versionCount),
      hasRemoteScripts: Boolean(row.hasRemoteScripts),
    }));
  }

  return {
    rows,
    total,
    catalogTotal,
    totalPages,
    page,
    verdictCounts,
    remoteCounts,
  };
}

export async function queryHomeStats(
  client: { $queryRaw: PrismaClient["$queryRaw"] },
): Promise<HomeStats> {
  const [skillsResult, versionsResult, findingsResult, jobsResult] =
    await Promise.all([
      client.$queryRaw<CountResult[]>(
        Prisma.sql`
          SELECT count(*)::bigint AS count
          FROM "skill" s
          WHERE ${CATALOG_BASE_CONDITION}
        `,
      ),
      client.$queryRaw<CountResult[]>(
        Prisma.sql`
          SELECT count(*)::bigint AS count
          FROM "skill_version" v
          JOIN "skill" s ON s."id" = v."skillId"
          WHERE ${CATALOG_BASE_CONDITION}
            AND v."verdict" IS NOT NULL
            AND v."analyzedAt" IS NOT NULL
        `,
      ),
      client.$queryRaw<CountResult[]>(
        Prisma.sql`
          SELECT count(*)::bigint AS count
          FROM "finding" f
          JOIN "skill" s ON s."latestVersionId" = f."versionId"
          WHERE ${CATALOG_BASE_CONDITION}
            AND f."severity" = 'critical'::"FindingSeverity"
        `,
      ),
      client.$queryRaw<CountResult[]>(
        Prisma.sql`
          SELECT count(*)::bigint AS count
          FROM "analysis_job" j
          WHERE j."status" IN ('queued'::"AnalysisJobStatus", 'running'::"AnalysisJobStatus")
        `,
      ),
    ]);

  return {
    skills: Number(skillsResult[0]?.count ?? 0),
    versions: Number(versionsResult[0]?.count ?? 0),
    criticalFindings: Number(findingsResult[0]?.count ?? 0),
    activeJobs: Number(jobsResult[0]?.count ?? 0),
  };
}

