export interface SkillStep {
  title: string;
  text: string;
}

export interface SkillRequirementGroup {
  label: string;
  items: string[];
}

export interface SkillFileDetail {
  path: string;
  language: string;
  lineCount: number;
  purpose: string;
  description: string;
}

export interface SkillFactItem {
  label: string;
  value: string;
}

export interface SkillDetails {
  slug: string;
  summary: string;
  audience: string;
  goodFor: string[];
  notFor: string[];
  steps: SkillStep[];
  requirements: SkillRequirementGroup[];
  files: SkillFileDetail[];
  facts: SkillFactItem[];
}

export function getMockSkillDetails(slug: string): SkillDetails | null {
  if (slug !== "explicar-cambios") {
    return null;
  }

  return {
    slug: "explicar-cambios",
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
    requirements: [
      {
        label: "Programas",
        items: ["git", "Python 3.11"],
      },
      {
        label: "Internet",
        items: ["api.github.com"],
      },
      {
        label: "Archivos que toca",
        items: [
          "Lee el repositorio",
          "Escribe en ~/.cache/explicar-cambios",
        ],
      },
      {
        label: "Claves y variables",
        items: ["GITHUB_TOKEN (opcional)"],
      },
    ],
    files: [
      {
        path: "SKILL.md",
        language: "Markdown",
        lineCount: 5,
        purpose: "Instrucciones y metadatos de la skill explicar-cambios.",
        description:
          "Define el nombre, la descripción breve y las pautas para que los agentes invoquen la skill. Declara el uso de git fetch para sincronizar referencias con el repositorio remoto.",
      },
      {
        path: "scripts/explain.py",
        language: "Python",
        lineCount: 110,
        purpose:
          "Recorre archivos Markdown y recopila referencias para explicar cambios.",
        description:
          "Script principal de la skill. Recorre los archivos Markdown del repositorio, realiza peticiones HTTP para obtener notas de versión y guarda datos temporales en el directorio de caché del usuario.",
      },
      {
        path: "references/legacy.md",
        language: "Markdown",
        lineCount: 1,
        purpose:
          "Conserva una referencia Markdown retirada que ya no está disponible en GitHub.",
        description:
          "Documento de referencia histórica conservado del análisis inicial. Explica procedimientos heredados aunque el archivo ya no esté presente en las versiones recientes de GitHub.",
      },
      {
        path: "scripts/check.py",
        language: "Python",
        lineCount: 1,
        purpose:
          "Comprueba la existencia de los archivos antes de guardarlos en la caché local.",
        description:
          "Comprueba que los directorios y archivos de destino existan antes de que el script principal escriba en la caché. Emite una confirmación de verificación en la salida.",
      },
      {
        path: "deploy.go",
        language: "Go",
        lineCount: 2,
        purpose:
          "Punto de entrada de una utilidad de despliegue escrita en Go.",
        description:
          "Punto de entrada de un ejecutable auxiliar compilable en Go. Contiene la función principal reservada para tareas de empaquetado y distribución en otros entornos.",
      },
      {
        path: "hooks/hooks.json",
        language: "JSON",
        lineCount: 3,
        purpose:
          "Declara el hook de validación que instala el plugin demo-tools.",
        description:
          "Configuración en formato JSON que registra el hook de pre-commit dentro de la integración demo-tools. Especifica qué comprobaciones previas deben ejecutarse antes de confirmar cambios.",
      },
      {
        path: "hooks/pre-commit.sh",
        language: "Shell",
        lineCount: 3,
        purpose: "Ejecuta git diff --check antes de confirmar cambios.",
        description:
          "Script de shell invocado por el hook de Git antes de cada commit. Activa el modo estricto y ejecuta git diff --check para evitar subir espacios en blanco o conflictos residuales.",
      },
      {
        path: ".mcp.json",
        language: "JSON",
        lineCount: 3,
        purpose:
          "Configura el servidor MCP de documentación instalado por el plugin.",
        description:
          "Manifiesto de configuración para Model Context Protocol (MCP). Declara un servidor de documentación local gestionado a través de npx para consultas en tiempo de ejecución.",
      },
    ],
    facts: [
      { label: "Repositorio", value: "ejemplo-org/skills-demo" },
      { label: "Carpeta", value: "skills/explicar-cambios" },
      { label: "Archivos", value: "8" },
      { label: "Líneas", value: "128" },
      { label: "Lenguajes", value: "Python, Go, Shell, Markdown, JSON" },
      { label: "Usa internet", value: "Sí" },
      { label: "Instala dependencias", value: "Sí" },
      { label: "Analizada", value: "24 oct 2026" },
    ],
  };
}
