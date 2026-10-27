import { describe, expect, test } from "bun:test";
import { mapJobState } from "./job-state";
import { toSkillAnalysis } from "./skill-analysis";

describe("mapJobState", () => {
  test("shows a queued fingerprint check as checking", () => {
    expect(mapJobState("queued", "fingerprint_check")).toBe("checking");
  });
});

describe("toSkillAnalysis", () => {
  const baseSkill = {
    name: "test-skill",
    slug: "test-skill",
    owner: "original-owner",
    repo: "original-repo",
    displayOwner: null,
    displayRepo: null,
    path: "skills/test",
    description: "Una skill de prueba",
  };

  const createReport = (overrides = {}) => ({
    schemaVersion: 1 as const,
    install: [
      {
        method: "folder" as const,
        command: "npx skills add org/repo",
        touches: "Copia la carpeta",
        source: null,
        matchesDeclared: true,
      },
    ],
    dependencies: [
      {
        ecosystem: "npm",
        name: "foo",
        version: "1.0.0",
        pinned: true,
        filePath: "package.json",
        line: 1,
        source: "manifest" as const,
      },
      {
        ecosystem: "PyPI",
        name: "bar",
        version: null,
        pinned: false,
        filePath: "requirements.txt",
        line: 2,
        source: "manifest" as const,
      },
    ],
    notExecuted: [],
    notVerifiable: [],
    steps: [{ label: "Reglas", done: 1, total: 1 }],
    coverage: {
      sourceBytes: 800,
      decompiledBytes: 0,
      unreviewableBytes: 200,
    },
    topFindingKey: null,
    suppressed: 0,
    ...overrides,
  });

  const baseVersion = {
    commitSha: "abc1234",
    verdict: "dangerous" as const,
    analyzedAt: new Date("2026-10-25T10:00:00Z"),
    report: createReport(),
    files: [
      {
        path: "SKILL.md",
        origin: "skill" as const,
        blobSha: "sha1",
        kind: "markdown",
        review: "source" as const,
        remoteUrl: null,
        downloadedAt: null,
      },
    ],
    findings: [],
  };

  test("maps no_serious_findings to the UI verdict", () => {
    const version = {
      ...baseVersion,
      verdict: "no_serious_findings" as const,
    };
    const result = toSkillAnalysis(baseSkill, [version]);
    expect(result).not.toBeNull();
    expect(result?.verdict).toBe("no-serious-findings");
  });

  test("orders findings and resolves topFindingId from topFindingKey", () => {
    const findings = [
      {
        id: "f-low",
        ruleId: "rule.low",
        severity: "low" as const,
        declared: false,
        filePath: "b.py",
        line: 10,
        title: "Low finding",
        evidence: "ev1",
      },
      {
        id: "f-crit-decl",
        ruleId: "rule.crit.decl",
        severity: "critical" as const,
        declared: true,
        filePath: "a.py",
        line: 20,
        title: "Critical declared finding",
        evidence: "ev2",
      },
      {
        id: "f-crit-undecl",
        ruleId: "rule.crit.undecl",
        severity: "critical" as const,
        declared: false,
        filePath: "a.py",
        line: 5,
        title: "Critical undeclared finding",
        evidence: "ev3",
      },
      {
        id: "f-high",
        ruleId: "rule.high",
        severity: "high" as const,
        declared: false,
        filePath: "c.py",
        line: 1,
        title: "High finding",
        evidence: "ev4",
      },
    ];

    const version = {
      ...baseVersion,
      report: createReport({ topFindingKey: "rule.high:c.py:1" }),
      findings,
    };

    const result = toSkillAnalysis(baseSkill, [version]);
    expect(result).not.toBeNull();
    expect(result?.findings.map((f) => f.id)).toEqual([
      "f-crit-undecl",
      "f-crit-decl",
      "f-high",
      "f-low",
    ]);
    expect(result?.topFindingId).toBe("f-high");
  });

  test("coverage percentages add up to 100", () => {
    const version = {
      ...baseVersion,
      report: createReport({
        coverage: {
          sourceBytes: 333,
          decompiledBytes: 333,
          unreviewableBytes: 334,
        },
      }),
    };
    const result = toSkillAnalysis(baseSkill, [version]);
    expect(result).not.toBeNull();
    const cov = result!.coverage;
    expect(cov.sourcePct + cov.decompiledPct + cov.unreviewablePct).toBe(100);

    const zeroVersion = {
      ...baseVersion,
      report: createReport({
        coverage: {
          sourceBytes: 0,
          decompiledBytes: 0,
          unreviewableBytes: 0,
        },
      }),
    };
    const zeroResult = toSkillAnalysis(baseSkill, [zeroVersion]);
    expect(zeroResult?.coverage).toEqual({
      sourcePct: 100,
      decompiledPct: 0,
      unreviewablePct: 0,
    });
  });

  test("marks binaries and remotes", () => {
    const version = {
      ...baseVersion,
      files: [
        {
          path: "bin/tool",
          origin: "skill" as const,
          blobSha: "b1",
          kind: "binary",
          review: "unreviewable" as const,
          remoteUrl: null,
          downloadedAt: null,
        },
        {
          path: "scripts/remote.sh",
          origin: "remote" as const,
          blobSha: "r1",
          kind: "shell",
          review: "source" as const,
          remoteUrl: "https://example.com/install.sh",
          downloadedAt: new Date("2026-10-25T12:00:00Z"),
        },
        {
          path: "plugin/hook.json",
          origin: "plugin" as const,
          blobSha: "p1",
          kind: "config",
          review: "source" as const,
          remoteUrl: null,
          downloadedAt: null,
        },
        {
          path: "code.py",
          origin: "skill" as const,
          blobSha: "c1",
          kind: "code",
          review: "source" as const,
          remoteUrl: null,
          downloadedAt: null,
        },
      ],
    };

    const result = toSkillAnalysis(baseSkill, [version]);
    expect(result).not.toBeNull();

    const binFile = result?.files.find((f) => f.path === "bin/tool");
    expect(binFile?.availability).toBe("binary");
    expect(binFile?.source).toBe("github");

    const remoteFile = result?.files.find((f) => f.path === "scripts/remote.sh");
    expect(remoteFile?.availability).toBe("available");
    expect(remoteFile?.source).toBe("remote");
    expect(remoteFile?.remoteUrl).toBe("https://example.com/install.sh");
    expect(remoteFile?.downloadedAt).toBe("2026-10-25T12:00:00.000Z");

    const pluginFile = result?.files.find((f) => f.path === "plugin/hook.json");
    expect(pluginFile?.source).toBe("plugin");

    const codeFile = result?.files.find((f) => f.path === "code.py");
    expect(codeFile?.source).toBe("github");
    expect(codeFile?.availability).toBe("available");
  });

  test("uses display owner and repo", () => {
    const skillWithDisplay = {
      ...baseSkill,
      displayOwner: "CodeLab614",
      displayRepo: "auditor-skills",
    };
    const result = toSkillAnalysis(skillWithDisplay, [baseVersion]);
    expect(result).not.toBeNull();
    expect(result?.owner).toBe("CodeLab614");
    expect(result?.repo).toBe("auditor-skills");

    const resultWithoutDisplay = toSkillAnalysis(baseSkill, [baseVersion]);
    expect(resultWithoutDisplay?.owner).toBe("original-owner");
    expect(resultWithoutDisplay?.repo).toBe("original-repo");
  });
});
