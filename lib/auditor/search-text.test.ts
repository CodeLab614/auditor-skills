import { describe, expect, test } from "bun:test";
import { normalizeSearchText, skillSearchText } from "./search-text";

describe("search-text", () => {
  test("normalizeSearchText removes accents and lowercases", () => {
    expect(normalizeSearchText("Análisis ÑANDÚ")).toBe("analisis nandu");
  });

  test("normalizeSearchText collapses spaces", () => {
    expect(normalizeSearchText("  pdf   Tools ")).toBe("pdf tools");
  });

  test("skillSearchText joins name, description and owner/repo", () => {
    expect(
      skillSearchText({
        name: "pdf-tools",
        description: "Lee PDFs",
        owner: "Acme",
        repo: "Skills",
      })
    ).toBe("pdf-tools lee pdfs acme/skills");
  });
});
