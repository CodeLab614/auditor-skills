import { describe, expect, test } from "bun:test";
import { getSkillAnalysis } from "./mock-data";
import {
  getMockSkillAi,
  getMockSkillDetailsView,
} from "./mock-skill-details";

describe("mock skill details", () => {
  test("getMockSkillAi returns details for explicar-cambios and null for others", () => {
    expect(getMockSkillAi("otra")).toBeNull();
    expect(getMockSkillAi("")).toBeNull();
    expect(getMockSkillAi("sincronizador")).toBeNull();

    const ai = getMockSkillAi("explicar-cambios");
    expect(ai).not.toBeNull();
    expect(ai!.steps.length > 0).toBe(true);
    expect(Object.keys(ai!.files).length > 0).toBe(true);
  });

  test("getMockSkillDetailsView builds view from mock analysis", async () => {
    const analysis = await getSkillAnalysis("explicar-cambios");
    expect(analysis).not.toBeNull();
    const details = await getMockSkillDetailsView("explicar-cambios");
    expect(details).not.toBeNull();

    expect(details!.files.length).toBe(analysis!.files.length);
    for (let i = 0; i < details!.files.length; i++) {
      expect(details!.files[i].path).toBe(analysis!.files[i].path);
      expect(details!.files[i].lineCount).toBe(analysis!.files[i].lines.length);
    }
  });

  test("unknown skill has no mock details view", async () => {
    expect(await getMockSkillDetailsView("unknown-skill")).toBeNull();
    expect(await getMockSkillDetailsView("")).toBeNull();
  });
});

test("the mock skill page lists what the skill needs", async () => {
  const view = await getMockSkillDetailsView("explicar-cambios");
  expect((view?.needs.length ?? 0) > 0).toBe(true);
});
