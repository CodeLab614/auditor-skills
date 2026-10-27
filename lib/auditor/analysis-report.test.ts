import { describe, expect, test } from "bun:test";
import { analysisReportSchema } from "./analysis-report";

describe("analysisReportSchema", () => {
  const validReport = {
    schemaVersion: 1,
    install: [
      {
        method: "folder",
        command: "npx skills add org/repo --skill test",
        touches: "Copia la carpeta",
        source: null,
        matchesDeclared: true,
      },
    ],
    dependencies: [
      {
        ecosystem: "npm",
        name: "zod",
        version: "3.24.1",
        pinned: true,
        filePath: "package.json",
        line: 12,
        source: "manifest",
      },
    ],
    notExecuted: [
      {
        path: "test.py",
        reason: "La ejecución aislada todavía no está activa",
      },
    ],
    notVerifiable: ["No se revisó el código"],
    steps: [
      { label: "Reglas", done: 5, total: 5 },
    ],
    coverage: {
      sourceBytes: 700,
      decompiledBytes: 0,
      unreviewableBytes: 300,
    },
    topFindingKey: "rule.test:scripts/run.py:10",
    suppressed: 0,
  };

  test("accepts a valid report", () => {
    const result = analysisReportSchema.safeParse(validReport);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(1);
    }
  });

  test("rejects another schemaVersion", () => {
    const invalidReport = { ...validReport, schemaVersion: 2 };
    const result = analysisReportSchema.safeParse(invalidReport);
    expect(result.success).toBe(false);
  });
});
