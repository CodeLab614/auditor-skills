"use server";

import { getAnalysisProgress } from "@/lib/auditor/queries";
import type { AnalysisProgress } from "@/lib/auditor/types";
import { reportError } from "@/lib/report-error";

type ActionResponse<T> = {
  response: "success" | "error";
  message: string;
  data: T | null;
};

const validProgressId = /^[a-zA-Z0-9_-]{1,100}$/;

export async function getAnalysisProgressAction(
  id: string,
): Promise<ActionResponse<AnalysisProgress>> {
  if (typeof id !== "string" || !validProgressId.test(id)) {
    return { response: "error", message: "El identificador no es válido", data: null };
  }

  try {
    const progress = id.startsWith("demo-")
      ? await import("@/lib/auditor/mock-data").then(({ getAnalysisProgress }) =>
        getAnalysisProgress(id))
      : await getAnalysisProgress(id);

    if (!progress) {
      return { response: "error", message: "No se encontró el análisis", data: null };
    }

    return { response: "success", message: "Avance actualizado", data: progress };
  } catch (error) {
    reportError(error, { area: "auditor.progress.get" });
    return { response: "error", message: "No se pudo consultar el avance", data: null };
  }
}
