import { describe, expect, test } from "bun:test";
import { getSkillAnalysis } from "./mock-data";
import { getMockSkillDetails } from "./mock-skill-details";

describe("mock skill details", () => {
  test("skill details list every file of the mock analysis", async () => {
    const analysis = await getSkillAnalysis("explicar-cambios");
    expect(analysis).not.toBeNull();
    const details = getMockSkillDetails("explicar-cambios");
    expect(details).not.toBeNull();

    expect(details!.files.map((file) => file.path)).toEqual(
      analysis!.files.map((file) => file.path),
    );
  });

  test("skill details line counts match the mock files", async () => {
    const analysis = await getSkillAnalysis("explicar-cambios");
    expect(analysis).not.toBeNull();
    const details = getMockSkillDetails("explicar-cambios");
    expect(details).not.toBeNull();

    expect(details!.files.length).toBe(analysis!.files.length);
    for (let i = 0; i < details!.files.length; i++) {
      expect(details!.files[i].lineCount).toBe(analysis!.files[i].lines.length);
      expect(details!.files[i].purpose).toBe(analysis!.files[i].purpose);
    }
  });

  test("unknown skill has no details", () => {
    expect(getMockSkillDetails("unknown-skill")).toBeNull();
    expect(getMockSkillDetails("sincronizador")).toBeNull();
    expect(getMockSkillDetails("")).toBeNull();
  });
});
