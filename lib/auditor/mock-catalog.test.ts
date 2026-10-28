import { describe, expect, test } from "bun:test";
import { catalogQuery } from "./catalog-query";
import {
  getMockCatalog,
  queryMockCatalog,
} from "./mock-catalog";

describe("mock catalog", () => {
  test("mock catalog is deterministic and has 1240 skills", () => {
    const catalog1 = getMockCatalog();
    const catalog2 = getMockCatalog();

    expect(catalog1.length).toBe(1240);
    expect(catalog1).toEqual(catalog2);

    const slugs = new Set(catalog1.map((item) => item.slug));
    expect(slugs.size).toBe(1240);

    const dangerous = catalog1.filter((item) => item.verdict === "dangerous");
    const review = catalog1.filter((item) => item.verdict === "review");
    const safe = catalog1.filter((item) => item.verdict === "no-serious-findings");
    const remote = catalog1.filter((item) => item.hasRemoteScripts);

    expect(dangerous.length > 100).toBe(true);
    expect(dangerous.length < 200).toBe(true);
    expect(dangerous.every((item) => item.warnings >= 1)).toBe(true);

    expect(review.length > 300).toBe(true);
    expect(review.length < 450).toBe(true);

    expect(safe.length > 600).toBe(true);
    expect(safe.length < 800).toBe(true);

    expect(remote.length > 130).toBe(true);
    expect(remote.length < 240).toBe(true);

    expect(catalog1.every((item) => item.versionCount >= 1 && item.versionCount <= 9)).toBe(true);
    expect(catalog1.every((item) => item.warnings >= 0 && item.warnings <= 14)).toBe(true);
  });

  test("search ignores case and accents", () => {
    // Search with accents and uppercase vs lowercase and without accents
    const withAccents = queryMockCatalog(
      catalogQuery.parse({ q: "CÓDIGO" }),
    );
    const withoutAccents = queryMockCatalog(
      catalogQuery.parse({ q: "codigo" }),
    );

    expect(withAccents.total > 0).toBe(true);
    expect(withAccents.total).toBe(withoutAccents.total);
    expect(withAccents.rows.map((r) => r.slug)).toEqual(
      withoutAccents.rows.map((r) => r.slug),
    );

    // Search by repo owner ignoring case
    const repoUpper = queryMockCatalog(catalogQuery.parse({ q: "ACME" }));
    const repoLower = queryMockCatalog(catalogQuery.parse({ q: "acme" }));
    expect(repoUpper.total > 0).toBe(true);
    expect(repoUpper.total).toBe(repoLower.total);
  });

  test("search also matches the description", () => {
    const result = queryMockCatalog(
      catalogQuery.parse({ q: "huérfanos" }),
    );
    expect(result.total > 0).toBe(true);
    expect(
      result.rows.every((row) =>
        row.description.toLowerCase().includes("huérfanos"),
      ),
    ).toBe(true);
  });

  test("skill names only use ascii letters, digits and dashes", () => {
    const catalog = getMockCatalog();
    expect(catalog.length).toBe(1240);
    expect(catalog.every((item) => /^[a-z0-9-]+$/.test(item.name))).toBe(true);
    expect(catalog.every((item) => /^[a-z0-9-]+$/.test(item.slug))).toBe(true);
  });

  test("verdict counts ignore the verdict filter", () => {
    const unfiltered = queryMockCatalog(catalogQuery.parse({}));
    const dangerousOnly = queryMockCatalog(
      catalogQuery.parse({ verdict: "dangerous" }),
    );

    // verdictCounts must remain identical between unfiltered and verdict-filtered queries
    expect(dangerousOnly.verdictCounts).toEqual(unfiltered.verdictCounts);

    // But rows and total must reflect the verdict filter
    expect(dangerousOnly.total).toBe(unfiltered.verdictCounts.dangerous);
    expect(dangerousOnly.rows.every((row) => row.verdict === "dangerous")).toBe(true);
  });

  test("remote counts ignore the remote filter", () => {
    const unfiltered = queryMockCatalog(catalogQuery.parse({}));
    const remoteOnly = queryMockCatalog(
      catalogQuery.parse({ remote: "yes" }),
    );

    // remoteCounts must remain identical between unfiltered and remote-filtered queries
    expect(remoteOnly.remoteCounts).toEqual(unfiltered.remoteCounts);

    // But rows and total must reflect the remote filter
    expect(remoteOnly.total).toBe(unfiltered.remoteCounts.yes);
    expect(remoteOnly.rows.every((row) => row.hasRemoteScripts)).toBe(true);
  });

  test("most warnings sort is descending", () => {
    const result = queryMockCatalog(
      catalogQuery.parse({ sort: "most-warnings", pageSize: "100" }),
    );

    expect(result.rows.length).toBe(100);
    for (let i = 0; i < result.rows.length - 1; i++) {
      const current = result.rows[i];
      const next = result.rows[i + 1];
      expect(current.warnings >= next.warnings).toBe(true);
      if (current.warnings === next.warnings) {
        expect(current.analyzedAt >= next.analyzedAt).toBe(true);
      }
    }
  });

  test("page beyond the last one clamps to the last page", () => {
    const result = queryMockCatalog(
      catalogQuery.parse({ page: "99999", pageSize: "20" }),
    );

    expect(result.total).toBe(1240);
    expect(result.totalPages).toBe(62);
    expect(result.page).toBe(62);
    expect(result.rows.length).toBe(20);
  });

  test("no results gives one empty page", () => {
    const result = queryMockCatalog(
      catalogQuery.parse({ q: "nonexistent-skill-query-xyz-12345" }),
    );

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.rows).toEqual([]);
  });

  test("the most recent skill has a long description", () => {
    const result = queryMockCatalog(catalogQuery.parse({ sort: "recent" }));
    expect(result.rows.length > 0).toBe(true);
    expect(result.rows[0].description.length > 200).toBe(true);
  });

  test("about one in ten descriptions is long", () => {
    const catalog = getMockCatalog();
    const longDescriptions = catalog.filter(
      (item) => item.description.length > 200,
    );
    const ratio = longDescriptions.length / catalog.length;
    expect(ratio >= 0.05 && ratio <= 0.15).toBe(true);
  });
});
