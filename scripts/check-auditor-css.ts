import { readFileSync } from "node:fs";

const cssPath = "app/(auditor)/auditor.css";
const css = readFileSync(cssPath, "utf8");
const rules: { selector: string; line: number; inMedia: boolean }[] = [];
const stack: { inMedia: boolean; inKeyframes: boolean }[] = [];
let ruleStart = 0;
let inMedia = false;
let inKeyframes = false;

function selectorsFrom(prelude: string): string[] {
  const selectors: string[] = [];
  let start = 0;
  let squareDepth = 0;
  let parenDepth = 0;

  for (let index = 0; index < prelude.length; index += 1) {
    const char = prelude[index];
    if (char === "[") squareDepth += 1;
    if (char === "]") squareDepth -= 1;
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (char === "," && squareDepth === 0 && parenDepth === 0) {
      selectors.push(prelude.slice(start, index).trim());
      start = index + 1;
    }
  }

  selectors.push(prelude.slice(start).trim());
  return selectors.filter(Boolean);
}

for (let index = 0; index < css.length; index += 1) {
  const char = css[index];
  if (char === "{") {
    const prelude = css.slice(ruleStart, index).replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const isMedia = /^@media\b/.test(prelude);
    const isKeyframes = /^@(?:-webkit-)?keyframes\b/.test(prelude);
    stack.push({ inMedia, inKeyframes });
    inMedia ||= isMedia;
    inKeyframes ||= isKeyframes;

    if (!prelude.startsWith("@") && !inKeyframes) {
      const line = css.slice(0, ruleStart).split("\n").length;
      for (const selector of selectorsFrom(prelude)) {
        rules.push({ selector, line, inMedia });
      }
    }
    ruleStart = index + 1;
  } else if (char === "}") {
    const parent = stack.pop();
    inMedia = parent?.inMedia ?? false;
    inKeyframes = parent?.inKeyframes ?? false;
    ruleStart = index + 1;
  } else if (char === ";" && stack.length === 0) {
    ruleStart = index + 1;
  }
}

const bases = new Map<string, number[]>();
for (const rule of rules) {
  if (rule.inMedia) continue;
  const positions = bases.get(rule.selector) ?? [];
  positions.push(rule.line);
  bases.set(rule.selector, positions);
}

const issues: string[] = [];
for (const [selector, lines] of bases) {
  if (lines.length > 1) {
    issues.push(`Regla base repetida para "${selector}" en líneas ${lines.join(", ")}.`);
  }
}

for (const rule of rules) {
  if (!rule.inMedia) continue;
  const baseLines = bases.get(rule.selector);
  const firstBase = baseLines?.[0];
  if (firstBase !== undefined && rule.line < firstBase) {
    issues.push(
      `Regla responsive de "${rule.selector}" en línea ${rule.line} precede su base de línea ${firstBase}.`,
    );
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("auditor.css: sin reglas base repetidas ni reglas responsive anteriores a su base.");
}
