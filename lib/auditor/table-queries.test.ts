import { describe, expect, test } from "bun:test";
import {
  buildJobStatusConditions,
  buildQueueWhere,
  buildSkillsWhere,
  buildSubmissionsWhere,
  claimsTableQuery,
  filterTakedowns,
  queueTableQuery,
  skillsTableQuery,
  submissionsTableQuery,
} from "./table-queries";
import { auditorTableLabels } from "./table-labels";
import type { TakedownRequest } from "./types";

describe("table queries", () => {
  test("job status filter maps checking to queued fingerprint checks", () => {
    const conditions = buildJobStatusConditions(["checking"]);
    expect(conditions).toEqual([
      { status: "queued", kind: "fingerprint_check" },
    ]);

    const where = buildQueueWhere(
      queueTableQuery.parse({ status: "checking" }),
    );
    expect(where).toEqual({
      AND: [
        {
          OR: [{ status: "queued", kind: "fingerprint_check" }],
        },
      ],
    });
  });

  test("job status filter maps queued to queued analyses", () => {
    const conditions = buildJobStatusConditions(["queued"]);
    expect(conditions).toEqual([{ status: "queued", kind: "analysis" }]);

    const where = buildQueueWhere(queueTableQuery.parse({ status: "queued" }));
    expect(where).toEqual({
      AND: [
        {
          OR: [{ status: "queued", kind: "analysis" }],
        },
      ],
    });
  });

  test("submissions where always scopes to the user", () => {
    const emptyWhere = buildSubmissionsWhere(
      "user-123",
      submissionsTableQuery.empty(),
    );
    expect(emptyWhere).toEqual({
      AND: [{ userId: "user-123" }],
    });

    const filteredWhere = buildSubmissionsWhere(
      "user-456",
      submissionsTableQuery.parse({ q: "my-skill", status: "running" }),
    );
    expect(filteredWhere).toEqual({
      AND: [
        { userId: "user-456" },
        {
          version: {
            skill: {
              OR: [
                { name: { contains: "my-skill", mode: "insensitive" } },
                { owner: { contains: "my-skill", mode: "insensitive" } },
                { repo: { contains: "my-skill", mode: "insensitive" } },
                { displayOwner: { contains: "my-skill", mode: "insensitive" } },
                { displayRepo: { contains: "my-skill", mode: "insensitive" } },
              ],
            },
          },
        },
        {
          OR: [{ status: "running" }],
        },
      ],
    });
  });

  test("queue search includes the submitter", () => {
    const where = buildQueueWhere(queueTableQuery.parse({ q: "maria" }));
    expect(where).toEqual({
      AND: [
        {
          OR: [
            { version: { skill: { name: { contains: "maria", mode: "insensitive" } } } },
            { version: { skill: { owner: { contains: "maria", mode: "insensitive" } } } },
            { version: { skill: { repo: { contains: "maria", mode: "insensitive" } } } },
            { version: { skill: { displayOwner: { contains: "maria", mode: "insensitive" } } } },
            { version: { skill: { displayRepo: { contains: "maria", mode: "insensitive" } } } },
            { user: { name: { contains: "maria", mode: "insensitive" } } },
            { user: { email: { contains: "maria", mode: "insensitive" } } },
          ],
        },
      ],
    });
  });

  test("skills visibility filter maps to hiddenAt", () => {
    const visibleWhere = buildSkillsWhere(
      skillsTableQuery.parse({ visibility: "visible" }),
    );
    expect(visibleWhere).toEqual({
      AND: [{ hiddenAt: null }],
    });

    const hiddenWhere = buildSkillsWhere(
      skillsTableQuery.parse({ visibility: "hidden" }),
    );
    expect(hiddenWhere).toEqual({
      AND: [{ hiddenAt: { not: null } }],
    });
  });

  test("filterTakedowns filters by status, kind and verification", () => {
    const sampleRequests: TakedownRequest[] = [
      {
        id: "req-1",
        skillSlug: "skill-1",
        skillName: "Skill One",
        requester: "Author A",
        kind: "error",
        verified: true,
        status: "pending",
        message: "Error found",
        createdAt: "2026-10-25T10:00:00Z",
      },
      {
        id: "req-2",
        skillSlug: "skill-2",
        skillName: "Skill Two",
        requester: "Author B",
        kind: "takedown",
        verified: false,
        status: "resolved",
        message: "Takedown request",
        createdAt: "2026-10-24T10:00:00Z",
      },
      {
        id: "req-3",
        skillSlug: "skill-3",
        skillName: "Skill Three",
        requester: "Author C",
        kind: "other",
        verified: true,
        status: "rejected",
        message: "Other issue",
        createdAt: "2026-10-23T10:00:00Z",
      },
    ];

    // Filter by status
    const pendingResult = filterTakedowns(
      sampleRequests,
      claimsTableQuery.parse({ status: "pending" }),
    );
    expect(pendingResult.rows.map((r) => r.id)).toEqual(["req-1"]);

    // Filter by kind
    const takedownResult = filterTakedowns(
      sampleRequests,
      claimsTableQuery.parse({ kind: "takedown" }),
    );
    expect(takedownResult.rows.map((r) => r.id)).toEqual(["req-2"]);

    // Filter by verification: unverified
    const unverifiedResult = filterTakedowns(
      sampleRequests,
      claimsTableQuery.parse({ verified: "unverified" }),
    );
    expect(unverifiedResult.rows.map((r) => r.id)).toEqual(["req-2"]);

    // Combined filter
    const combinedResult = filterTakedowns(
      sampleRequests,
      claimsTableQuery.parse({
        status: ["pending", "resolved"],
        kind: "error",
        verified: "verified",
      }),
    );
    expect(combinedResult.rows.map((r) => r.id)).toEqual(["req-1"]);
  });

  test("filterTakedowns clamps the page to the last one", () => {
    const sampleRequests: TakedownRequest[] = Array.from(
      { length: 5 },
      (_, i) => ({
        id: `req-${i + 1}`,
        skillSlug: `skill-${i + 1}`,
        skillName: `Skill ${i + 1}`,
        requester: "Author",
        kind: "error" as const,
        verified: true,
        status: "pending" as const,
        message: "Message",
        createdAt: "2026-10-25T10:00:00Z",
      }),
    );

    // Requesting page 10 when totalPages is 1 (5 items, default pageSize 20)
    const result = filterTakedowns(
      sampleRequests,
      claimsTableQuery.parse({ page: "10" }),
    );
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.rows).toHaveLength(5);
  });

  test("auditor labels pluralize the results text", () => {
    const labels = auditorTableLabels(
      { singular: "envío", plural: "envíos" },
      "Sin envíos",
    );
    const results = labels.results!;

    expect(results({ from: 0, to: 0, total: 0 })).toBe(
      "Mostrando 0 de 0 envíos",
    );
    expect(results({ from: 1, to: 1, total: 1 })).toBe(
      "Mostrando 1–1 de 1 envío",
    );
    expect(results({ from: 1, to: 10, total: 25 })).toBe(
      "Mostrando 1–10 de 25 envíos",
    );
  });
});
