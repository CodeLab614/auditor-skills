import { describe, expect, test } from "bun:test";
import { getVisiblePages } from "@/components/auditor/ui/pagination";

describe("auditor pagination", () => {
  test("pagination fills a single missing page instead of an ellipsis", () => {
    // Page 3 of 62: sortedPages=[1, 2, 3, 4, 62] -> [1, 2, 3, 4, "ellipsis", 62]
    expect(getVisiblePages(3, 62)).toEqual([1, 2, 3, 4, "ellipsis", 62]);

    // Page 1 of 62: [1, 2, "ellipsis", 62]
    expect(getVisiblePages(1, 62)).toEqual([1, 2, "ellipsis", 62]);

    // Page 4 of 62: sortedPages would be [1, 3, 4, 5, 62]; between 1 and 3 only 2 is missing, so 2 is filled
    expect(getVisiblePages(4, 62)).toEqual([1, 2, 3, 4, 5, "ellipsis", 62]);

    // Page 59 of 62: sortedPages would be [1, 58, 59, 60, 62]; between 60 and 62 only 61 is missing, so 61 is filled
    expect(getVisiblePages(59, 62)).toEqual([1, "ellipsis", 58, 59, 60, 61, 62]);

    // Page 5 of 62: between 1 and 4 missing 2, 3 (more than 1) -> ellipsis
    expect(getVisiblePages(5, 62)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 62]);
  });
});
