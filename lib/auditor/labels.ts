import type { JobState, Severity, TakedownRequest, Verdict } from "./types";

export const verdictLabel: Record<Verdict, string> = {
  dangerous: "Peligrosa",
  review: "Revisar",
  "no-serious-findings": "Sin hallazgos graves",
};

export function isInstallable(verdict: Verdict): boolean {
  return verdict === "no-serious-findings";
}

export const severityLabel: Record<Severity, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const jobStateLabel: Record<JobState, string> = {
  queued: "En cola",
  checking: "Comprobando",
  running: "En curso",
  paused: "En pausa",
  done: "Terminado",
  failed: "Fallido",
};

export const analysisStepLabel: Record<string, string> = {
  download: "Descargando el commit",
  inventory: "Haciendo el inventario",
  rules: "Pasando las reglas",
  install: "Analizando la instalación",
  remote: "Descargando los scripts remotos",
  dependencies: "Consultando las dependencias",
  verdict: "Calculando el veredicto",
  save: "Guardando el resultado",
};

export const takedownKindLabel: Record<TakedownRequest["kind"], string> = {
  error: "Error del análisis",
  takedown: "Solicitud de retirada",
  other: "Otro",
};

export const takedownStatusLabel: Record<TakedownRequest["status"], string> = {
  pending: "Pendiente",
  resolved: "Resuelta",
  rejected: "Rechazada",
};

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("es", { useGrouping: "always" }).format(value);
}

export function formatDay(value: string): string {
  try {
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) return value;

    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(date)
      .replaceAll(".", "");
  } catch {
    return value;
  }
}

export function formatDate(value: string): string {
  try {
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) return value;

    const datePart = new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(date)
      .replaceAll(".", "");
    if (!value.includes("T") && !value.includes(":")) return datePart;
    const timePart = new Intl.DateTimeFormat("es", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    }).format(date);
    return `${datePart}, ${timePart} UTC`;
  } catch {
    return value;
  }
}

const invisibleLabels = new Map<number, string>([
  [0x200b, "U+200B"],
  [0x200c, "U+200C"],
  [0x200d, "U+200D"],
  [0x2060, "U+2060"],
  [0xfeff, "U+FEFF"],
  [0x061c, "U+061C"],
  [0x200e, "U+200E"],
  [0x200f, "U+200F"],
  [0x202a, "U+202A"],
  [0x202b, "U+202B"],
  [0x202c, "U+202C"],
  [0x202d, "U+202D"],
  [0x202e, "U+202E"],
  [0x2066, "U+2066"],
  [0x2067, "U+2067"],
  [0x2068, "U+2068"],
  [0x2069, "U+2069"],
]);

export function revealInvisible(
  text: string,
): { text: string; invisible: boolean }[] {
  return Array.from(text, (character) => {
    const codepoint = character.codePointAt(0);
    const label =
      codepoint === undefined ? undefined : invisibleLabels.get(codepoint);
    return {
      text: label ? `⟨${label}⟩` : character,
      invisible: Boolean(label),
    };
  });
}
