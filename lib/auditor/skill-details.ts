import type { Verdict } from "@/lib/auditor/types";
import { analysisHref } from "@/lib/auditor/skill-links";

export interface SkillDetailsView {
  slug: string;
  name: string;
  owner: string;
  repo: string;
  path: string;
  verdict: Verdict;
  analyzedAt: string;
  description: string;
  files: {
    path: string;
    displayPath: string;
    inSkillFolder: boolean;
    language: string | null;
    lineCount: number;
  }[];
  needs: {
    key: "net" | "install" | "exec" | "filesystem" | "secrets";
    label: string;
    items: {
      title: string;
      evidence: string;
      fileCount: number;
      href: string;
    }[];
  }[];
  facts: {
    repository: string;
    folder: string;
    fileCount: number;
    lineCount: number;
    languages: string[];
    usesInternet: boolean;
    installsDependencies: boolean;
    analyzedAt: string;
  };
}

export interface SkillAiDetails {
  summary: string;
  audience: string;
  goodFor: string[];
  notFor: string[];
  steps: { title: string; text: string }[];
  files: Record<string, { purpose: string; description: string }>;
}

export interface SkillDetailsInput {
  skill: {
    slug: string;
    name: string;
    owner: string;
    repo: string;
    path: string;
    description: string;
  };
  version: {
    verdict: Verdict | "no_serious_findings" | string;
    analyzedAt: string;
  };
  files: {
    path: string;
    language: string | null;
    lineCount: number;
  }[];
  findings: {
    ruleId: string;
    category: string;
    title: string;
    evidence: string;
    filePath: string;
    line: number;
  }[];
}

const STORED_LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  js: "JavaScript",
  shell: "Shell",
  powershell: "PowerShell",
  markdown: "Markdown",
  config: "Configuración",
};

// The worker stores a coarse language family; the file extension names it better.
export function displayLanguage(path: string, stored: string | null): string | null {
  return languageFromPath(path) ?? (stored ? STORED_LANGUAGE_LABELS[stored] ?? stored : null);
}

// Files are stored relative to the repository; inside the skill folder they read better without it.
function skillFiles(
  skillPath: string,
  files: SkillDetailsInput["files"],
): SkillDetailsView["files"] {
  const prefix = skillPath.trim().replace(/\/+$/, "");
  const mapped = files.map((file) => {
    const inSkillFolder = !prefix || file.path.startsWith(`${prefix}/`);
    return {
      ...file,
      displayPath: prefix && inSkillFolder ? file.path.slice(prefix.length + 1) : file.path,
      inSkillFolder,
    };
  });
  return [...mapped.filter((file) => file.inSkillFolder), ...mapped.filter((file) => !file.inSkillFolder)];
}

export function languageFromPath(path: string): string | null {
  const filename = path.split("/").pop() ?? path;
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) return null;
  const ext = filename.slice(dotIndex).toLowerCase();

  switch (ext) {
    case ".py":
      return "Python";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "JavaScript";
    case ".ts":
    case ".tsx":
      return "TypeScript";
    case ".sh":
    case ".bash":
      return "Shell";
    case ".md":
      return "Markdown";
    case ".json":
      return "JSON";
    case ".go":
      return "Go";
    case ".yml":
    case ".yaml":
      return "YAML";
    case ".toml":
      return "TOML";
    default:
      return null;
  }
}

type NeedKey = "net" | "install" | "exec" | "filesystem" | "secrets";

interface NeedGroupConfig {
  key: NeedKey;
  label: string;
  categories: string[];
}

const NEED_GROUPS: NeedGroupConfig[] = [
  { key: "net", label: "Internet", categories: ["net"] },
  { key: "install", label: "Instala", categories: ["dependencies", "install"] },
  { key: "exec", label: "Ejecuta", categories: ["exec"] },
  { key: "filesystem", label: "Archivos que toca", categories: ["filesystem"] },
  { key: "secrets", label: "Claves y variables", categories: ["secrets"] },
];

export function toSkillDetailsView(input: SkillDetailsInput): SkillDetailsView {
  const rawVerdict = input.version.verdict;
  const verdict: Verdict =
    rawVerdict === "no_serious_findings"
      ? "no-serious-findings"
      : (rawVerdict.replaceAll("_", "-") as Verdict);

  const needs: SkillDetailsView["needs"] = [];

  for (const group of NEED_GROUPS) {
    const matchingFindings = input.findings.filter((f) =>
      group.categories.includes(f.category.toLowerCase().trim()),
    );

    if (matchingFindings.length === 0) continue;

    const occurrencesByKey = new Map<string, typeof input.findings>();

    for (const finding of matchingFindings) {
      const key = `${finding.ruleId}:::${finding.evidence}`;
      const existing = occurrencesByKey.get(key);
      if (existing) {
        existing.push(finding);
      } else {
        occurrencesByKey.set(key, [finding]);
      }
    }

    const items: SkillDetailsView["needs"][number]["items"] = [];

    for (const occurrences of occurrencesByKey.values()) {
      occurrences.sort((a, b) => {
        const fileDiff = a.filePath.localeCompare(b.filePath);
        if (fileDiff !== 0) return fileDiff;
        return a.line - b.line;
      });

      const first = occurrences[0];
      const distinctFiles = new Set(occurrences.map((o) => o.filePath));

      items.push({
        title: first.title,
        evidence: first.evidence,
        fileCount: distinctFiles.size,
        href: analysisHref(input.skill.slug, {
          file: first.filePath,
          line: first.line,
        }),
      });
    }

    items.sort((a, b) => {
      const fileCompare = a.href.localeCompare(b.href);
      if (fileCompare !== 0) return fileCompare;
      return a.title.localeCompare(b.title);
    });

    needs.push({
      key: group.key,
      label: group.label,
      items,
    });
  }

  const lineCount = input.files.reduce((sum, f) => sum + f.lineCount, 0);
  const languages: string[] = [];
  for (const file of input.files) {
    if (file.language && !languages.includes(file.language)) {
      languages.push(file.language);
    }
  }

  const usesInternet = needs.some((n) => n.key === "net");
  const installsDependencies = needs.some((n) => n.key === "install");

  const files = skillFiles(input.skill.path, input.files);

  const folder =
    input.skill.path && input.skill.path.trim().length > 0
      ? input.skill.path
      : "raíz del repositorio";

  return {
    slug: input.skill.slug,
    name: input.skill.name,
    owner: input.skill.owner,
    repo: input.skill.repo,
    path: input.skill.path,
    verdict,
    analyzedAt: input.version.analyzedAt,
    description: input.skill.description,
    files,
    needs,
    facts: {
      repository: `${input.skill.owner}/${input.skill.repo}`,
      folder,
      fileCount: input.files.length,
      lineCount,
      languages,
      usesInternet,
      installsDependencies,
      analyzedAt: input.version.analyzedAt,
    },
  };
}

const NEED_PHRASES: Record<NeedKey, string> = {
  net: "usa internet",
  install: "instala dependencias",
  exec: "ejecuta comandos en tu equipo",
  filesystem: "lee o escribe archivos de tu equipo",
  secrets: "usa claves o variables de entorno",
};

function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

// Spanish summary built only from analysis data, shown until the AI summary exists.
export function skillSummary(view: SkillDetailsView): string {
  const { facts } = view;
  const fileWord = facts.fileCount === 1 ? "archivo" : "archivos";
  const languages = facts.languages.length > 0 ? ` en ${joinSpanish(facts.languages)}` : "";
  const sentences = [`Skill de ${facts.repository} con ${facts.fileCount} ${fileWord}${languages}.`];

  const does = view.needs.map((need) => NEED_PHRASES[need.key]);
  if (does.length > 0) sentences.push(`${capitalize(joinSpanish(does))}.`);

  if (!facts.usesInternet && !facts.installsDependencies) {
    sentences.push("No usa internet ni instala dependencias.");
  } else if (!facts.usesInternet) {
    sentences.push("No usa internet.");
  } else if (!facts.installsDependencies) {
    sentences.push("No instala dependencias.");
  }

  return sentences.join(" ");
}
