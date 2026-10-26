export function parseSkillManifest(text: string): { name: string; description: string } | null {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex < 0) return null;

  const frontMatter = lines.slice(1, closingIndex);
  const fields = new Map<string, string>();
  for (let index = 0; index < frontMatter.length; index += 1) {
    const line = frontMatter[index]!;
    const match = /^(name|description):(?:[ \t]*(.*))?$/.exec(line);
    if (!match) continue;

    const key = match[1]!;
    const value = match[2] ?? '';
    if (value === '|' || value === '|-' || value === '|+' || value === '>' || value === '>-' || value === '>+') {
      const blockLines: string[] = [];
      while (index + 1 < frontMatter.length && /^\s+/.test(frontMatter[index + 1]!)) {
        blockLines.push(frontMatter[index + 1]!.trim());
        index += 1;
      }
      fields.set(key, value.startsWith('>') ? blockLines.join(' ') : blockLines.join('\n'));
      continue;
    }
    fields.set(key, unquote(value.trim()));
  }

  const name = fields.get('name')?.trim();
  const description = fields.get('description')?.trim();
  return name && description ? { name, description } : null;
}

function unquote(value: string): string {
  if (value.length >= 2 && value[0] === '"' && value.at(-1) === '"') {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  if (value.length >= 2 && value[0] === "'" && value.at(-1) === "'") {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}
