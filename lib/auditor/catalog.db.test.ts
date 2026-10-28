import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { catalogQuery } from "./catalog-query";
import { queryCatalog, queryHomeStats } from "./catalog";
import { skillSearchText } from "./search-text";

const url = process.env.AUDITOR_TEST_DATABASE_URL;

describe.skipIf(!url)("catalog database queries", () => {
  if (!url) return;

  const pathname = new URL(url).pathname;
  if (!pathname.endsWith("_test")) {
    throw new Error(`Refusing to run tests against non-test database: ${pathname}`);
  }

  const connectionString = url.includes("sslmode=")
    ? url
    : `${url}${url.includes("?") ? "&" : "?"}sslmode=verify-full`;
  const sslDisabled = new URL(connectionString).searchParams.get("sslmode") === "disable";

  const pool = new Pool({
    connectionString,
    ssl: sslDisabled ? false : { rejectUnauthorized: true },
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "finding", "skill_version", "skill", "blocked_repository", "analysis_job" CASCADE'
    );
  });

  async function createSkill(options: {
    name: string;
    description?: string;
    owner?: string;
    repo?: string;
    displayOwner?: string;
    displayRepo?: string;
    path?: string;
    slug?: string;
    hiddenAt?: Date | null;
    verdict?: "dangerous" | "review" | "no_serious_findings";
    warnings?: number;
    analyzedAt?: Date;
    hasRemoteScripts?: boolean;
    skipLatestVersion?: boolean;
    extraFinishedVersions?: {
      verdict: "dangerous" | "review" | "no_serious_findings";
      analyzedAt: Date;
    }[];
    extraUnfinishedVersions?: number;
  }) {
    const owner = options.owner ?? "acme";
    const repo = options.repo ?? "skills";
    const displayOwner = options.displayOwner;
    const displayRepo = options.displayRepo;
    const description = options.description ?? `Description for ${options.name}`;
    const path = options.path ?? `skills/${options.name}`;
    const slug = options.slug ?? options.name;
    const verdict = options.verdict ?? "review";
    const warnings = options.warnings ?? 0;
    const analyzedAt = options.analyzedAt ?? new Date("2026-10-25T12:00:00Z");
    const hasRemoteScripts = options.hasRemoteScripts ?? false;

    const versionId = crypto.randomUUID();

    const skill = await prisma.skill.create({
      data: {
        name: options.name,
        description,
        owner,
        repo,
        displayOwner,
        displayRepo,
        path,
        slug,
        hiddenAt: options.hiddenAt ?? null,
        latestVersionId: options.skipLatestVersion ? null : versionId,
        latestVerdict: options.skipLatestVersion ? null : verdict,
        latestAnalyzedAt: options.skipLatestVersion ? null : analyzedAt,
        latestWarningCount: options.skipLatestVersion ? null : warnings,
        latestHasRemoteScripts: options.skipLatestVersion ? null : hasRemoteScripts,
        searchText: skillSearchText({
          name: options.name,
          description,
          owner: displayOwner ?? owner,
          repo: displayRepo ?? repo,
        }),
      },
    });

    if (!options.skipLatestVersion) {
      await prisma.skillVersion.create({
        data: {
          id: versionId,
          skillId: skill.id,
          commitSha: "commit1",
          submittedRef: "main",
          filesFingerprint: crypto.randomUUID(),
          verdict,
          analyzedAt,
          hasRemoteScripts,
        },
      });
    }

    if (options.extraFinishedVersions) {
      for (const ev of options.extraFinishedVersions) {
        await prisma.skillVersion.create({
          data: {
            id: crypto.randomUUID(),
            skillId: skill.id,
            commitSha: "commit-extra",
            submittedRef: "main",
            filesFingerprint: crypto.randomUUID(),
            verdict: ev.verdict,
            analyzedAt: ev.analyzedAt,
          },
        });
      }
    }

    if (options.extraUnfinishedVersions) {
      for (let i = 0; i < options.extraUnfinishedVersions; i++) {
        await prisma.skillVersion.create({
          data: {
            id: crypto.randomUUID(),
            skillId: skill.id,
            commitSha: `commit-unf-${i}`,
            submittedRef: "main",
            filesFingerprint: crypto.randomUUID(),
            verdict: null,
            analyzedAt: null,
          },
        });
      }
    }

    return skill;
  }

  test("search ignores accents and case", async () => {
    await createSkill({ name: "análisis-pdf", description: "Lee archivos PDF" });

    const result = await queryCatalog(
      prisma,
      catalogQuery.parse({ q: "ANALISIS" }),
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe("análisis-pdf");
  });

  test("search treats percent and underscore literally", async () => {
    await createSkill({ name: "a_b", description: "Skill with underscore" });
    await createSkill({ name: "ab", description: "Skill without underscore" });

    const underscoreResult = await queryCatalog(
      prisma,
      catalogQuery.parse({ q: "a_b" }),
    );
    expect(underscoreResult.rows.length).toBe(1);
    expect(underscoreResult.rows[0].name).toBe("a_b");

    const percentResult = await queryCatalog(
      prisma,
      catalogQuery.parse({ q: "%" }),
    );
    expect(percentResult.rows.length).toBe(0);
    expect(percentResult.total).toBe(0);
  });

  test("verdict counts ignore the verdict filter", async () => {
    await createSkill({ name: "skill-dangerous", verdict: "dangerous" });
    await createSkill({ name: "skill-review", verdict: "review" });
    await createSkill({ name: "skill-safe", verdict: "no_serious_findings" });

    const result = await queryCatalog(
      prisma,
      catalogQuery.parse({ verdict: "dangerous" }),
    );

    expect(result.verdictCounts.dangerous).toBe(1);
    expect(result.verdictCounts.review).toBe(1);
    expect(result.verdictCounts["no-serious-findings"]).toBe(1);
    expect(result.verdictCounts.all).toBe(3);

    expect(result.total).toBe(1);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].verdict).toBe("dangerous");
  });

  test("remote counts ignore the remote filter", async () => {
    await createSkill({ name: "skill-remote", hasRemoteScripts: true });
    await createSkill({ name: "skill-local", hasRemoteScripts: false });

    const result = await queryCatalog(
      prisma,
      catalogQuery.parse({ remote: "yes" }),
    );

    expect(result.remoteCounts.yes).toBe(1);
    expect(result.remoteCounts.no).toBe(1);
    expect(result.remoteCounts.all).toBe(2);

    expect(result.total).toBe(1);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].hasRemoteScripts).toBe(true);
  });

  test("each sort orders as specified", async () => {
    await createSkill({
      name: "beta",
      analyzedAt: new Date("2026-10-03T12:00:00Z"),
      warnings: 5,
    });
    await createSkill({
      name: "Gamma",
      analyzedAt: new Date("2026-10-02T12:00:00Z"),
      warnings: 5,
    });
    await createSkill({
      name: "alpha",
      analyzedAt: new Date("2026-10-04T12:00:00Z"),
      warnings: 10,
    });
    await createSkill({
      name: "delta",
      analyzedAt: new Date("2026-10-01T12:00:00Z"),
      warnings: 2,
    });

    const recent = await queryCatalog(
      prisma,
      catalogQuery.parse({ sort: "recent" }),
    );
    expect(recent.rows.map((r) => r.name)).toEqual([
      "alpha",
      "beta",
      "Gamma",
      "delta",
    ]);

    const byName = await queryCatalog(
      prisma,
      catalogQuery.parse({ sort: "name" }),
    );
    expect(byName.rows.map((r) => r.name)).toEqual([
      "alpha",
      "beta",
      "delta",
      "Gamma",
    ]);

    const mostWarnings = await queryCatalog(
      prisma,
      catalogQuery.parse({ sort: "most-warnings" }),
    );
    expect(mostWarnings.rows.map((r) => r.name)).toEqual([
      "alpha",
      "beta",
      "Gamma",
      "delta",
    ]);

    const fewestWarnings = await queryCatalog(
      prisma,
      catalogQuery.parse({ sort: "fewest-warnings" }),
    );
    expect(fewestWarnings.rows.map((r) => r.name)).toEqual([
      "delta",
      "beta",
      "Gamma",
      "alpha",
    ]);
  });

  test("page beyond the last one clamps to the last page", async () => {
    for (let i = 1; i <= 25; i++) {
      await createSkill({
        name: `skill-${String(i).padStart(2, "0")}`,
        slug: `skill-${String(i).padStart(2, "0")}`,
      });
    }

    const result = await queryCatalog(
      prisma,
      catalogQuery.parse({ page: "9" }),
    );

    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
    expect(result.rows.length).toBe(5);
  });

  test("empty catalog gives one empty page", async () => {
    const result = await queryCatalog(prisma, catalogQuery.parse({}));

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.rows).toEqual([]);
    expect(result.catalogTotal).toBe(0);
  });

  test("hidden, blocked and unfinished skills are excluded", async () => {
    await createSkill({ name: "valid-skill", owner: "other", repo: "tools" });

    await createSkill({
      name: "hidden-skill",
      hiddenAt: new Date("2026-10-20T10:00:00Z"),
    });

    await createSkill({
      name: "unfinished-skill",
      skipLatestVersion: true,
    });

    await createSkill({
      name: "blocked-skill",
      owner: "acme",
      repo: "skills",
    });
    await prisma.blockedRepository.create({
      data: {
        owner: "Acme",
        repo: "Skills",
        reason: "Blocked by admin",
      },
    });

    const result = await queryCatalog(prisma, catalogQuery.parse({}));

    expect(result.catalogTotal).toBe(1);
    expect(result.total).toBe(1);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe("valid-skill");
  });

  test("version count only counts finished versions", async () => {
    await createSkill({
      name: "multi-version-skill",
      verdict: "dangerous",
      analyzedAt: new Date("2026-10-25T12:00:00Z"),
      extraFinishedVersions: [
        {
          verdict: "review",
          analyzedAt: new Date("2026-10-24T12:00:00Z"),
        },
      ],
      extraUnfinishedVersions: 1,
    });

    const result = await queryCatalog(prisma, catalogQuery.parse({}));

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].versionCount).toBe(2);
  });

  test("rows show the display owner and repo", async () => {
    await createSkill({
      name: "display-name-skill",
      owner: "acme",
      displayOwner: "Acme",
      repo: "custom-skills",
      displayRepo: "Custom-Skills",
    });

    const result = await queryCatalog(prisma, catalogQuery.parse({}));

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].owner).toBe("Acme");
    expect(result.rows[0].repo).toBe("Custom-Skills");
  });

  test("home stats count only listed skills", async () => {
    const visibleSkill = await createSkill({
      name: "visible-skill",
      verdict: "review",
      analyzedAt: new Date("2026-10-25T12:00:00Z"),
      extraFinishedVersions: [
        {
          verdict: "review",
          analyzedAt: new Date("2026-10-20T12:00:00Z"),
        },
      ],
    });

    await prisma.finding.create({
      data: {
        versionId: visibleSkill.latestVersionId!,
        ruleId: "rule-crit-1",
        category: "security",
        severity: "critical",
        filePath: "index.js",
        line: 10,
        title: "Critical finding 1",
        evidence: "eval(input)",
      },
    });
    await prisma.finding.create({
      data: {
        versionId: visibleSkill.latestVersionId!,
        ruleId: "rule-crit-2",
        category: "security",
        severity: "critical",
        filePath: "index.js",
        line: 20,
        title: "Critical finding 2",
        evidence: "exec(cmd)",
      },
    });
    await prisma.finding.create({
      data: {
        versionId: visibleSkill.latestVersionId!,
        ruleId: "rule-high-1",
        category: "security",
        severity: "high",
        filePath: "index.js",
        line: 30,
        title: "High finding",
        evidence: "warning",
      },
    });

    const hiddenSkill = await createSkill({
      name: "hidden-skill",
      hiddenAt: new Date("2026-10-20T10:00:00Z"),
    });
    await prisma.finding.create({
      data: {
        versionId: hiddenSkill.latestVersionId!,
        ruleId: "rule-hidden-crit",
        category: "security",
        severity: "critical",
        filePath: "index.js",
        line: 1,
        title: "Hidden finding",
        evidence: "bad",
      },
    });

    const unfinishedSkill = await createSkill({
      name: "unfinished-skill",
      skipLatestVersion: true,
    });
    const unfinishedVersion = await prisma.skillVersion.create({
      data: {
        id: crypto.randomUUID(),
        skillId: unfinishedSkill.id,
        commitSha: "sha-unf",
        submittedRef: "main",
        filesFingerprint: crypto.randomUUID(),
        verdict: null,
        analyzedAt: null,
      },
    });
    await prisma.finding.create({
      data: {
        versionId: unfinishedVersion.id,
        ruleId: "rule-unf-crit",
        category: "security",
        severity: "critical",
        filePath: "index.js",
        line: 1,
        title: "Unfinished finding",
        evidence: "bad",
      },
    });

    const blockedSkill = await createSkill({
      name: "blocked-skill",
      owner: "blocked-owner",
      repo: "blocked-repo",
    });
    await prisma.blockedRepository.create({
      data: {
        owner: "Blocked-Owner",
        repo: "Blocked-Repo",
        reason: "Blocked by admin",
      },
    });
    await prisma.finding.create({
      data: {
        versionId: blockedSkill.latestVersionId!,
        ruleId: "rule-blocked-crit",
        category: "security",
        severity: "critical",
        filePath: "index.js",
        line: 1,
        title: "Blocked finding",
        evidence: "bad",
      },
    });

    await prisma.analysisJob.create({
      data: {
        versionId: visibleSkill.latestVersionId!,
        kind: "analysis",
        status: "queued",
      },
    });
    await prisma.analysisJob.create({
      data: {
        versionId: visibleSkill.latestVersionId!,
        kind: "analysis",
        status: "running",
      },
    });
    await prisma.analysisJob.create({
      data: {
        versionId: visibleSkill.latestVersionId!,
        kind: "analysis",
        status: "done",
      },
    });

    const stats = await queryHomeStats(prisma);
    expect(stats).toEqual({
      skills: 1,
      versions: 2,
      criticalFindings: 2,
      activeJobs: 2,
    });
  });
});
