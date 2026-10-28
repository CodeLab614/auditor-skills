import { describe, expect, test } from "bun:test";
import {
  analysisHref,
  legacyAnalysisRedirect,
  skillHref,
} from "./skill-links";

describe("skill-links", () => {
  test("analysisHref builds version, file and line links", () => {
    expect(
      analysisHref("x", { version: 2, file: "scripts/a b.py", line: 49 })
    ).toBe("/skills/x/analysis?v=2&file=scripts%2Fa%20b.py#L49");
    expect(analysisHref("x", { section: "install" })).toBe(
      "/skills/x/analysis?section=install"
    );
    expect(analysisHref("x")).toBe("/skills/x/analysis");
  });

  test("legacy links with v, file or section go to the analysis page", () => {
    expect(legacyAnalysisRedirect("x", { v: "2", file: "a b.py" })).toBe(
      "/skills/x/analysis?v=2&file=a%20b.py"
    );
    expect(legacyAnalysisRedirect("x", { v: "abc" })).toBe(
      "/skills/x/analysis"
    );
    expect(legacyAnalysisRedirect("x", {})).toBeNull();
  });

  test("skillHref points to the skill page", () => {
    expect(skillHref("x")).toBe("/skills/x");
  });
});
