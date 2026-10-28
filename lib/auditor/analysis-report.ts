import { z } from "zod";

export const analysisReportSchema = z.object({
  schemaVersion: z.literal(1),
  install: z.array(
    z.object({
      method: z.enum(["folder", "plugin", "readme"]),
      command: z.string(),
      touches: z.string(),
      source: z.string().nullable(),
      matchesDeclared: z.boolean(),
    }),
  ),
  dependencies: z.array(
    z.object({
      ecosystem: z.string(),
      name: z.string(),
      version: z.string().nullable(),
      pinned: z.boolean(),
      filePath: z.string(),
      line: z.number(),
      source: z.enum(["manifest", "install"]),
    }),
  ),
  notExecuted: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
    }),
  ),
  notVerifiable: z.array(z.string()),
  steps: z.array(
    z.object({
      label: z.string(),
      done: z.number(),
      total: z.number(),
    }),
  ),
  coverage: z.object({
    sourceBytes: z.number(),
    decompiledBytes: z.number(),
    unreviewableBytes: z.number(),
  }),
  topFindingKey: z.string().nullable(),
  suppressed: z.number(),
});

export type AnalysisReport = z.infer<typeof analysisReportSchema>;
