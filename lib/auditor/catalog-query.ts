import { defineTableQuery } from "@/lib/table-query";
import type { Verdict } from "@/lib/auditor/types";

export type CatalogFilter = "verdict" | "remote" | "sort";

export const catalogQuery = defineTableQuery<CatalogFilter>({
  searchMaxLength: 100,
  filters: {
    verdict: {
      param: "verdict",
      values: ["dangerous", "review", "no-serious-findings"] as const,
      multiple: false,
    },
    remote: {
      param: "remote",
      values: ["yes", "no"] as const,
      multiple: false,
    },
    sort: {
      param: "sort",
      values: [
        "recent",
        "name",
        "most-warnings",
        "fewest-warnings",
      ] as const,
      multiple: false,
    },
  },
});

export interface CatalogRow {
  slug: string;
  name: string;
  description: string;
  owner: string;
  repo: string;
  verdict: Verdict;
  warnings: number;
  analyzedAt: string;
  versionCount: number;
  hasRemoteScripts: boolean;
}

export interface CatalogPage<R extends CatalogRow = CatalogRow> {
  rows: R[];
  total: number;
  catalogTotal: number;
  totalPages: number;
  page: number;
  verdictCounts: Record<Verdict | "all", number>;
  remoteCounts: Record<"all" | "yes" | "no", number>;
}

export interface HomeStats {
  skills: number;
  versions: number;
  criticalFindings: number;
  activeJobs: number;
}

