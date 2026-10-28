import { defineTableQuery, type TableParams } from "@/lib/table-query";
import type { CatalogEntry, Verdict } from "@/lib/auditor/types";

export type MockCatalogEntry = CatalogEntry & {
  hasRemoteScripts: boolean;
  description: string;
};

export type CatalogFilter = "verdict" | "remote" | "sort";

export const catalogQuery = defineTableQuery<CatalogFilter>({
  searchMaxLength: 100,
  filters: {
    verdict: {
      param: "verdict",
      values: ["dangerous", "review", "no-serious-findings"] as const,
      multiple: false,
    },
    remote: {
      param: "remote",
      values: ["yes", "no"] as const,
      multiple: false,
    },
    sort: {
      param: "sort",
      values: [
        "recent",
        "name",
        "most-warnings",
        "fewest-warnings",
      ] as const,
      multiple: false,
    },
  },
});

export interface MockCatalogQueryResult {
  rows: MockCatalogEntry[];
  total: number;
  catalogTotal: number;
  totalPages: number;
  page: number;
  verdictCounts: Record<Verdict | "all", number>;
  remoteCounts: Record<"all" | "yes" | "no", number>;
}

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function createPrng(seed = 20261025) {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OWNERS = [
  "acme",
  "agent-stack",
  "core-ai",
  "deep-labs",
  "prompt-hub",
  "hyper-tools",
  "cloud-craft",
  "open-agents",
  "secure-ops",
  "dev-flow",
  "tool-crew",
  "byte-labs",
  "meta-agent",
  "flow-forge",
  "agentic-org",
  "syntax-tree",
  "orbit-ai",
  "vector-net",
  "codelab614",
  "nexus-dev",
];

const REPOS = [
  "agent-skills",
  "skills",
  "community-tools",
  "extensions",
  "core-skills",
  "plugins",
  "agent-hub",
  "capabilities",
  "developer-kit",
  "auditor-suite",
];

const DOMAINS = [
  "pdf",
  "code",
  "git",
  "data",
  "agent",
  "security",
  "docker",
  "cloud",
  "api",
  "auth",
  "sql",
  "ai",
  "web",
  "prompt",
  "test",
  "file",
  "json",
  "slack",
  "notion",
  "github",
  "search",
  "vision",
  "audio",
  "chat",
  "email",
  "codigo",
  "gestion",
  "analisis",
  "conexion",
  "auditoria",
  "configuracion",
  "optimizacion",
];

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  pdf: "Extrae texto y metadatos de documentos PDF sin ejecutar código embebido.",
  code: "Inspecciona código fuente en busca de vulnerabilidades y malas prácticas.",
  git: "Verifica el historial de commits en Git en busca de secretos expuestos.",
  data: "Valida la integridad de esquemas de datos y detecta tipos incompatibles.",
  agent: "Supervisa el ciclo de vida de agentes y previene comportamientos erráticos.",
  security: "Audita controles de seguridad y detecta configuraciones riesgosas en el entorno.",
  docker: "Supervisa contenedores Docker y previene escaladas de privilegios indebidas.",
  cloud: "Monitorea recursos desplegados en la nube y previene fugas de información.",
  api: "Inspecciona llamadas a APIs externas y valida credenciales en el entorno.",
  auth: "Valida tokens de autenticación y previene fugas de sesiones activas.",
  sql: "Audita consultas SQL y bloquea sentencias potencialmente destructivas.",
  ai: "Evalúa modelos de lenguaje locales y valida el aislamiento del entorno.",
  web: "Filtra peticiones HTTP salientes y bloquea conexiones a orígenes no seguros.",
  prompt: "Revisa los prompts de un proyecto y avisa de instrucciones peligrosas.",
  test: "Ejecuta suites de pruebas automatizadas y comprueba la cobertura mínima.",
  file: "Rastrea cambios en el sistema de archivos y alerta sobre accesos anómalos.",
  json: "Formatea y reestructura respuestas JSON para consumo seguro de agentes.",
  slack: "Envía notificaciones de alerta a canales de Slack mediante webhooks firmados.",
  notion: "Sincroniza notas y tareas con Notion preservando permisos de lectura.",
  github: "Audita permisos en repositorios remotos y detecta accesos excesivos.",
  search: "Indexa recursos del espacio de trabajo para búsquedas semánticas locales.",
  vision: "Analiza imágenes adjuntas y detecta datos sensibles antes de enviarlas.",
  audio: "Procesa señales de audio y transcribe comandos de voz en entornos aislados.",
  chat: "Gestiona canales de conversación interactivos y filtra contenido inapropiado.",
  email: "Verifica remitentes y filtra correos maliciosos antes de ser procesados.",
  codigo: "Analiza dependencias externas y detecta paquetes huérfanos o no declarados.",
  gestion: "Supervisa la ejecución de flujos de trabajo y previene bucles infinitos.",
  analisis: "Examina scripts de instalación y verifica la integridad de los binarios.",
  conexion: "Monitorea conexiones de red salientes y bloquea endpoints no autorizados.",
  auditoria: "Exporta trazas de auditoría en formatos estructurados para análisis posterior.",
  configuracion: "Comprueba la sintaxis de archivos de configuración y detecta errores comunes.",
  optimizacion: "Optimiza consultas a bases de datos vectoriales y previene desbordamientos.",
};

const ACTIONS = [
  "tools",
  "assistant",
  "auditor",
  "generator",
  "helper",
  "scanner",
  "bridge",
  "sync",
  "analyzer",
  "runner",
  "crawler",
  "formatter",
  "parser",
  "validator",
  "pipeline",
  "watcher",
  "inspector",
  "proxy",
  "builder",
  "fetcher",
  "exporter",
  "cleaner",
];

const LONG_DESCRIPTIONS = [
  "Supervisa de forma continua la ejecución de agentes en el entorno local, intercepta comandos potencialmente destructivos sobre el sistema de archivos, bloquea conexiones salientes no autorizadas y genera trazas forenses detalladas en formato estructurado para su posterior auditoría.",
  "Inspecciona llamadas a APIs externas en tiempo de ejecución, valida la integridad de los encabezados de autenticación, verifica que no se filtren variables de entorno sensibles y almacena métricas completas para detectar anomalías o abusos en el consumo de cuotas.",
  "Examina dependencias de terceros y scripts del ciclo de vida del paquete, detecta código ofuscado o binarios no declarados, evalúa permisos requeridos en el sistema anfitrión y emite un veredicto de seguridad previo a su instalación o despliegue en producción.",
  "Analiza el árbol de llamadas en busca de fugas de memoria, audita la concurrencia en tareas asíncronas para prevenir condiciones de carrera críticas y genera informes detallados con recomendaciones directas para optimizar el rendimiento sin comprometer el aislamiento.",
];

function generateMockCatalog(): MockCatalogEntry[] {
  const prng = createPrng(20261025);
  const total = 1240;
  const entries: MockCatalogEntry[] = [];
  const usedSlugs = new Set<string>();

  // 18 months before 2026-10-25T12:00:00Z
  const endDateMs = Date.UTC(2026, 9, 25, 12, 0, 0);
  const msIn18Months = 18 * 30.5 * 24 * 3600 * 1000;

  for (let i = 0; i < total; i++) {
    const domain = DOMAINS[Math.floor(prng() * DOMAINS.length)];
    const action = ACTIONS[Math.floor(prng() * ACTIONS.length)];
    const owner = OWNERS[Math.floor(prng() * OWNERS.length)];
    const repo = REPOS[Math.floor(prng() * REPOS.length)];

    let baseName = `${domain}-${action}`;
    let slugCandidate = normalizeSearch(baseName)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (usedSlugs.has(slugCandidate)) {
      let suffix = 2;
      while (usedSlugs.has(`${slugCandidate}-${suffix}`)) {
        suffix++;
      }
      slugCandidate = `${slugCandidate}-${suffix}`;
      baseName = `${baseName}-${suffix}`;
    }
    usedSlugs.add(slugCandidate);

    const path =
      i % 4 === 0
        ? `skills/${baseName}`
        : i % 4 === 1
          ? `tools/${baseName}/SKILL.md`
          : i % 4 === 2
            ? `plugins/${baseName}`
            : `packages/${baseName}/SKILL.md`;

    // Verdict: ~12% dangerous, ~30% review, rest no-serious-findings
    const verdictRoll = prng();
    let verdict: Verdict;
    if (verdictRoll < 0.12) {
      verdict = "dangerous";
    } else if (verdictRoll < 0.42) {
      verdict = "review";
    } else {
      verdict = "no-serious-findings";
    }

    // Dangerous must have at least 1 warning (1 to 14)
    let warnings: number;
    if (verdict === "dangerous") {
      warnings = 1 + Math.floor(prng() * 14);
    } else if (verdict === "review") {
      warnings = Math.floor(prng() * 11);
    } else {
      warnings = Math.floor(prng() * 4);
    }

    const versionCount = 1 + Math.floor(prng() * 9);
    const hasRemoteScripts = prng() < 0.15;

    const offsetMs = Math.floor(prng() * msIn18Months);
    const analyzedAt = new Date(endDateMs - offsetMs).toISOString();
    let description =
      DOMAIN_DESCRIPTIONS[domain] ??
      "Revisa los prompts de un proyecto y avisa de instrucciones peligrosas.";

    if (i % 10 === 0) {
      description =
        LONG_DESCRIPTIONS[Math.floor(i / 10) % LONG_DESCRIPTIONS.length];
    }

    entries.push({
      slug: slugCandidate,
      name: baseName,
      description,
      owner,
      repo,
      path,
      verdict,
      warnings,
      analyzedAt,
      versionCount,
      hasRemoteScripts,
    });
  }

  let mostRecent = entries[0];
  for (let i = 1; i < entries.length; i++) {
    const cmp = entries[i].analyzedAt.localeCompare(mostRecent.analyzedAt);
    if (
      cmp > 0 ||
      (cmp === 0 && entries[i].slug.localeCompare(mostRecent.slug) < 0)
    ) {
      mostRecent = entries[i];
    }
  }
  if (mostRecent.description.length <= 200) {
    mostRecent.description = LONG_DESCRIPTIONS[0];
  }

  return entries;
}

let cachedMockCatalog: MockCatalogEntry[] | null = null;

export function getMockCatalog(): MockCatalogEntry[] {
  if (!cachedMockCatalog) {
    cachedMockCatalog = generateMockCatalog();
  }
  return cachedMockCatalog;
}

function matchesSearch(entry: MockCatalogEntry, rawQuery: string): boolean {
  if (!rawQuery) return true;
  const needle = normalizeSearch(rawQuery.trim());
  if (!needle) return true;

  const haystack = normalizeSearch(
    `${entry.name} ${entry.description} ${entry.owner}/${entry.repo} ${entry.path}`,
  );
  return haystack.includes(needle);
}

export function queryMockCatalog(
  params: TableParams<CatalogFilter>,
): MockCatalogQueryResult {
  const catalog = getMockCatalog();
  const rawQ = params.q;
  const verdictFilter = params.filters.verdict[0] as Verdict | undefined;
  const remoteFilter = params.filters.remote[0];
  const sort = params.filters.sort[0] || "recent";

  // 1. Calculate verdictCounts: applies search and remote filter, but NOT verdict filter
  const forVerdict = catalog.filter((entry) => {
    if (!matchesSearch(entry, rawQ)) return false;
    if (remoteFilter === "yes" && !entry.hasRemoteScripts) return false;
    if (remoteFilter === "no" && entry.hasRemoteScripts) return false;
    return true;
  });

  const verdictCounts: Record<Verdict | "all", number> = {
    all: forVerdict.length,
    dangerous: 0,
    review: 0,
    "no-serious-findings": 0,
  };
  for (const entry of forVerdict) {
    verdictCounts[entry.verdict]++;
  }

  // 2. Calculate remoteCounts: applies search and verdict filter, but NOT remote filter
  const forRemote = catalog.filter((entry) => {
    if (!matchesSearch(entry, rawQ)) return false;
    if (verdictFilter && entry.verdict !== verdictFilter) return false;
    return true;
  });

  const remoteCounts: Record<"all" | "yes" | "no", number> = {
    all: forRemote.length,
    yes: 0,
    no: 0,
  };
  for (const entry of forRemote) {
    if (entry.hasRemoteScripts) {
      remoteCounts.yes++;
    } else {
      remoteCounts.no++;
    }
  }

  // 3. Filtered rows: apply both verdict and remote filters
  const filtered = forVerdict.filter((entry) => {
    if (verdictFilter && entry.verdict !== verdictFilter) return false;
    return true;
  });

  // 4. Sort
  if (sort === "name") {
    filtered.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "es");
      if (cmp !== 0) return cmp;
      return b.analyzedAt.localeCompare(a.analyzedAt);
    });
  } else if (sort === "most-warnings") {
    filtered.sort((a, b) => {
      const diff = b.warnings - a.warnings;
      if (diff !== 0) return diff;
      return b.analyzedAt.localeCompare(a.analyzedAt);
    });
  } else if (sort === "fewest-warnings") {
    filtered.sort((a, b) => {
      const diff = a.warnings - b.warnings;
      if (diff !== 0) return diff;
      return b.analyzedAt.localeCompare(a.analyzedAt);
    });
  } else {
    // "recent" (default)
    filtered.sort((a, b) => {
      const cmp = b.analyzedAt.localeCompare(a.analyzedAt);
      if (cmp !== 0) return cmp;
      return a.slug.localeCompare(b.slug);
    });
  }

  // 5. Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = total === 0 ? 1 : Math.max(1, Math.min(params.page, totalPages));
  const skip = (page - 1) * params.pageSize;
  const rows = filtered.slice(skip, skip + params.pageSize);

  return {
    rows,
    total,
    catalogTotal: catalog.length,
    totalPages,
    page,
    verdictCounts,
    remoteCounts,
  };
}
