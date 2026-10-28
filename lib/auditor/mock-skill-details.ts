import { getSkillAnalysis } from "./mock-data";
import {
  languageFromPath,
  toSkillDetailsView,
  type SkillAiDetails,
  type SkillDetailsView,
} from "./skill-details";

// Mock findings have no category; these match what the worker would report.
const MOCK_FINDING_CATEGORIES: Record<string, string> = {
  "fetch-declarado": "net",
  "red-declarada": "net",
  "archivo-externo": "filesystem",
  "envio-env": "secrets",
  "envio-env-reglas": "secrets",
  "remote-pipe": "install",
  "html-comentario": "markdown",
  "bun-install": "install",
};

export async function getMockSkillDetailsView(
  slug: string,
): Promise<SkillDetailsView | null> {
  const analysis = await getSkillAnalysis(slug);
  if (!analysis) return null;

  const currentVersion =
    analysis.versions.find((item) => item.number === analysis.version) ??
    analysis.versions.at(-1);

  const analyzedAt = currentVersion?.analyzedAt ?? "2026-10-24";

  const files = analysis.files.map((file) => ({
    path: file.path,
    language: languageFromPath(file.path),
    lineCount: file.lines.length,
  }));

  const findings = analysis.findings.map((f) => ({
    ruleId: f.id,
    category: MOCK_FINDING_CATEGORIES[f.id] ?? "",
    title: f.title,
    evidence: f.evidence,
    filePath: f.file,
    line: f.line,
  }));

  // Mock file paths are already relative to the skill folder, so the folder is set after building the view.
  const view = toSkillDetailsView({
    skill: {
      slug: analysis.slug,
      name: analysis.name,
      owner: analysis.owner,
      repo: analysis.repo,
      path: "",
      description:
        (analysis as { description?: string }).description ?? analysis.declares,
    },
    version: {
      verdict: analysis.verdict,
      analyzedAt,
    },
    files,
    findings,
  });
  return { ...view, path: analysis.path, facts: { ...view.facts, folder: analysis.path || view.facts.folder } };
}

export function getMockSkillAi(slug: string): SkillAiDetails | null {
  if (slug !== "explicar-cambios") {
    return null;
  }

  return {
    summary:
      "Analiza el historial de Git y los documentos Markdown de un repositorio para generar resúmenes automáticos y explicaciones de cambios entre versiones. Puede consultar notas de versión remotas mediante HTTPS y almacenar datos intermedios en una caché local.",
    audience:
      "Para desarrolladores y equipos técnicos que preparan notas de versión, revisan pull requests o auditan cambios en repositorios con documentación Markdown.",
    goodFor: [
      "Resumir cambios entre ramas o etiquetas de Git con documentación técnica.",
      "Extraer y contrastar notas de versión desde GitHub antes de publicar.",
      "Detectar modificaciones en archivos Markdown dentro de un árbol de código.",
      "Automatizar borradores de changelog en flujos locales de trabajo.",
    ],
    notFor: [
      "Entornos sin conexión a internet o con cortafuegos estrictos que bloqueen GitHub.",
      "Repositorios gigantes con miles de archivos Markdown donde se requiera análisis incremental.",
      "Proyectos que prohíban la escritura de archivos fuera del directorio de trabajo (~/.cache).",
    ],
    steps: [
      {
        title: "El agente lee SKILL.md",
        text: "Carga las instrucciones operativas, los metadatos y las dependencias declaradas para la tarea.",
      },
      {
        title: "Ejecuta scripts/explain.py",
        text: "Inicia el script en Python que inspecciona el árbol de trabajo y localiza archivos Markdown relevantes.",
      },
      {
        title: "Consulta GitHub",
        text: "Lanza git fetch y solicitudes HTTPS para descargar referencias y notas de versión actualizadas.",
      },
      {
        title: "Guarda una copia en la caché",
        text: "Almacena los datos intermedios en ~/.cache/explicar-cambios para agilizar consultas repetidas.",
      },
      {
        title: "Devuelve el resumen",
        text: "Compila y formatea la explicación detallada de los cambios detectados en la salida estándar.",
      },
    ],
    files: {
      "SKILL.md": {
        purpose: "Instrucciones y metadatos de la skill explicar-cambios.",
        description:
          "Define el nombre, la descripción breve y las pautas para que los agentes invoquen la skill. Declara el uso de git fetch para sincronizar referencias con el repositorio remoto.",
      },
      "scripts/explain.py": {
        purpose:
          "Recorre archivos Markdown y recopila referencias para explicar cambios.",
        description:
          "Script principal de la skill. Recorre los archivos Markdown del repositorio, realiza peticiones HTTP para obtener notas de versión y guarda datos temporales en el directorio de caché del usuario.",
      },
      "references/legacy.md": {
        purpose:
          "Conserva una referencia Markdown retirada que ya no está disponible en GitHub.",
        description:
          "Documento de referencia histórica conservado del análisis inicial. Explica procedimientos heredados aunque el archivo ya no esté presente en las versiones recientes de GitHub.",
      },
      "scripts/check.py": {
        purpose:
          "Comprueba la existencia de los archivos antes de guardarlos en la caché local.",
        description:
          "Comprueba que los directorios y archivos de destino existan antes de que el script principal escriba en la caché. Emite una confirmación de verificación en la salida.",
      },
      "deploy.go": {
        purpose:
          "Punto de entrada de una utilidad de despliegue escrita en Go.",
        description:
          "Punto de entrada de un ejecutable auxiliar compilable en Go. Contiene la función principal reservada para tareas de empaquetado y distribución en otros entornos.",
      },
      "hooks/hooks.json": {
        purpose:
          "Declara el hook de validación que instala el plugin demo-tools.",
        description:
          "Configuración en formato JSON que registra el hook de pre-commit dentro de la integración demo-tools. Especifica qué comprobaciones previas deben ejecutarse antes de confirmar cambios.",
      },
      "hooks/pre-commit.sh": {
        purpose: "Ejecuta git diff --check antes de confirmar cambios.",
        description:
          "Script de shell invocado por el hook de Git antes de cada commit. Activa el modo estricto y ejecuta git diff --check para evitar subir espacios en blanco o conflictos residuales.",
      },
      ".mcp.json": {
        purpose:
          "Configura el servidor MCP de documentación instalado por el plugin.",
        description:
          "Manifiesto de configuración para Model Context Protocol (MCP). Declara un servidor de documentación local gestionado a través de npx para consultas en tiempo de ejecución.",
      },
    },
  };
}
