import { describe, expect, test } from "bun:test";
import { analysisHref } from "./skill-links";
import {
  displayLanguage,
  skillSummary,
  languageFromPath,
  toSkillDetailsView,
  type SkillDetailsInput,
} from "./skill-details";

describe("skill-details", () => {
  const baseInput: SkillDetailsInput = {
    skill: {
      slug: "demo-skill",
      name: "demo-skill",
      owner: "acme",
      repo: "tools",
      path: "skills/demo",
      description: "Una skill de demostración",
    },
    version: {
      verdict: "review",
      analyzedAt: "2026-10-24T12:00:00.000Z",
    },
    files: [
      { path: "SKILL.md", language: "Markdown", lineCount: 10 },
      { path: "main.py", language: "Python", lineCount: 50 },
    ],
    findings: [],
  };

  test("needs group findings by category in a fixed order", () => {
    const input: SkillDetailsInput = {
      ...baseInput,
      findings: [
        {
          ruleId: "sec-1",
          category: "secrets",
          title: "Acceso a secretos",
          evidence: "API_KEY = os.environ['KEY']",
          filePath: "main.py",
          line: 5,
        },
        {
          ruleId: "net-1",
          category: "net",
          title: "Petición HTTP",
          evidence: "requests.get(url)",
          filePath: "main.py",
          line: 12,
        },
        {
          ruleId: "inst-1",
          category: "install",
          title: "Instala paquete",
          evidence: "pip install requests",
          filePath: "install.sh",
          line: 2,
        },
      ],
    };

    const view = toSkillDetailsView(input);
    expect(view.needs.map((n) => n.key)).toEqual(["net", "install", "secrets"]);
    expect(view.needs.map((n) => n.label)).toEqual([
      "Internet",
      "Instala",
      "Claves y variables",
    ]);

    // dependencies va en install, exec es «Ejecuta» y filesystem es «Archivos que toca»
    const fullInput: SkillDetailsInput = {
      ...baseInput,
      findings: [
        {
          ruleId: "dep-1",
          category: "dependencies",
          title: "Dependencia externa",
          evidence: "import requests",
          filePath: "main.py",
          line: 1,
        },
        {
          ruleId: "exec-1",
          category: "exec",
          title: "Ejecuta comando",
          evidence: "subprocess.run(['ls'])",
          filePath: "main.py",
          line: 20,
        },
        {
          ruleId: "fs-1",
          category: "filesystem",
          title: "Escribe archivo",
          evidence: "open('/tmp/test', 'w')",
          filePath: "main.py",
          line: 30,
        },
      ],
    };

    const fullView = toSkillDetailsView(fullInput);
    expect(fullView.needs.map((n) => n.key)).toEqual([
      "install",
      "exec",
      "filesystem",
    ]);
    expect(fullView.needs.map((n) => n.label)).toEqual([
      "Instala",
      "Ejecuta",
      "Archivos que toca",
    ]);
  });

  test("needs skip markdown, obfuscation and structure findings", () => {
    const input: SkillDetailsInput = {
      ...baseInput,
      findings: [
        {
          ruleId: "md-1",
          category: "markdown",
          title: "Comentario oculto",
          evidence: "<!-- hidden -->",
          filePath: "SKILL.md",
          line: 3,
        },
        {
          ruleId: "obf-1",
          category: "obfuscation",
          title: "Carácter invisible",
          evidence: "invisible char",
          filePath: "main.py",
          line: 8,
        },
        {
          ruleId: "struct-1",
          category: "structure",
          title: "Archivo inesperado",
          evidence: "unexpected file",
          filePath: "bin/helper",
          line: 1,
        },
      ],
    };

    const view = toSkillDetailsView(input);
    expect(view.needs).toEqual([]);
  });

  test("repeated findings show once with their file count and link to the first one", () => {
    const input: SkillDetailsInput = {
      ...baseInput,
      findings: [
        {
          ruleId: "rule-net",
          category: "net",
          title: "Petición HTTP",
          evidence: "requests.get(url)",
          filePath: "b.py",
          line: 9,
        },
        {
          ruleId: "rule-net",
          category: "net",
          title: "Petición HTTP",
          evidence: "requests.get(url)",
          filePath: "a.py",
          line: 20,
        },
      ],
    };

    const view = toSkillDetailsView(input);
    expect(view.needs).toHaveLength(1);
    expect(view.needs[0].items).toHaveLength(1);
    const item = view.needs[0].items[0];
    expect(item.fileCount).toBe(2);
    expect(item.href).toBe(
      analysisHref("demo-skill", { file: "a.py", line: 20 }),
    );
  });

  test("facts sum lines and list languages without duplicates", () => {
    const input: SkillDetailsInput = {
      ...baseInput,
      files: [
        { path: "src/main.py", language: "Python", lineCount: 100 },
        { path: "src/utils.py", language: "Python", lineCount: 50 },
        { path: "scripts/deploy.sh", language: "Shell", lineCount: 25 },
        { path: "README.md", language: "Markdown", lineCount: 15 },
        { path: "data.bin", language: null, lineCount: 0 },
      ],
    };

    const view = toSkillDetailsView(input);
    expect(view.facts.fileCount).toBe(5);
    expect(view.facts.lineCount).toBe(190);
    expect(view.facts.languages).toEqual(["Python", "Shell", "Markdown"]);
  });

  test("uses internet only when there are net findings", () => {
    const inputWithoutNet: SkillDetailsInput = {
      ...baseInput,
      findings: [
        {
          ruleId: "fs-1",
          category: "filesystem",
          title: "Toca disco",
          evidence: "write()",
          filePath: "main.py",
          line: 1,
        },
      ],
    };
    expect(toSkillDetailsView(inputWithoutNet).facts.usesInternet).toBe(false);

    const inputWithNet: SkillDetailsInput = {
      ...baseInput,
      findings: [
        {
          ruleId: "net-1",
          category: "net",
          title: "Usa red",
          evidence: "fetch()",
          filePath: "main.py",
          line: 1,
        },
      ],
    };
    expect(toSkillDetailsView(inputWithNet).facts.usesInternet).toBe(true);
  });

  test("languageFromPath guesses common languages", () => {
    expect(languageFromPath("scripts/explain.py")).toBe("Python");
    expect(languageFromPath("SKILL.md")).toBe("Markdown");
    expect(languageFromPath("hooks/pre-commit.sh")).toBe("Shell");
    expect(languageFromPath("src/main.rs")).toBeNull();
  });
});

describe("displayLanguage", () => {
  test("prefers the extension and names the stored family otherwise", () => {
    expect(displayLanguage("src/app.ts", "js")).toBe("TypeScript");
    expect(displayLanguage("deploy.ps1", "powershell")).toBe("PowerShell");
    expect(displayLanguage("setup.cfg", "config")).toBe("Configuración");
    expect(displayLanguage("README", null)).toBeNull();
  });
});

describe("skillSummary", () => {
  const base: SkillDetailsInput = {
    skill: { slug: "x", name: "x", owner: "Acme", repo: "skills", path: "x", description: "English text" },
    version: { verdict: "review", analyzedAt: "2026-10-27T10:00:00.000Z" },
    files: [
      { path: "a.py", language: "Python", lineCount: 10 },
      { path: "SKILL.md", language: "Markdown", lineCount: 5 },
      { path: "b.yaml", language: "YAML", lineCount: 2 },
    ],
    findings: [],
  };
  const finding = (category: string) => ({
    ruleId: category, category, title: "t", evidence: category, filePath: "a.py", line: 1,
  });

  test("describes the skill in Spanish from the analysis data", () => {
    const view = toSkillDetailsView({ ...base, findings: [finding("exec")] });
    expect(skillSummary(view)).toBe(
      "Skill de Acme/skills con 3 archivos en Python, Markdown y YAML. Ejecuta comandos en tu equipo. " +
        "No usa internet ni instala dependencias.",
    );
  });

  test("lists everything it does and only denies what it does not do", () => {
    const view = toSkillDetailsView({
      ...base,
      files: [{ path: "a.py", language: "Python", lineCount: 1 }],
      findings: [finding("net"), finding("secrets")],
    });
    expect(skillSummary(view)).toBe(
      "Skill de Acme/skills con 1 archivo en Python. Usa internet y usa claves o variables de entorno. " +
        "No instala dependencias.",
    );
  });
});
