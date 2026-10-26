export type TreeEntry = {
  path: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  mode: string;
};

export type DetectedSkill = {
  path: string;
  name: string;
  description: string;
  files: TreeEntry[];
  nestedSkillPaths: string[];
  totalBytes: number;
};

type Manifest = { name: string; description: string } | null;

export function detectSkills(
  tree: TreeEntry[],
  manifests: Map<string, Manifest>,
  basePath: string,
): { skills: DetectedSkill[] } | { error: string } {
  const normalizedBase = normalizePath(basePath);
  const skillManifests = [...manifests.entries()]
    .filter((entry): entry is [string, { name: string; description: string }] => entry[1] !== null)
    .map(([manifestPath, value]) => ({ path: parentPath(normalizePath(manifestPath)), ...value }))
    .sort((a, b) => comparePaths(a.path, b.path));

  const topLevelSkills = skillManifests.filter((skill) => !skillManifests.some((outer) =>
    outer.path !== skill.path && isWithin(skill.path, outer.path),
  ));
  const selected = topLevelSkills.filter(({ path }) => !normalizedBase || isWithin(path, normalizedBase));
  if (selected.length === 0) return { error: 'No hay ninguna skill en esta carpeta' };

  const result = selected.map((skill): DetectedSkill => {
    const nestedSkillPaths = skillManifests
      .filter((nested) => nested.path !== skill.path && isWithin(nested.path, skill.path))
      .map(({ path }) => path);
    const pluginRoot = findPluginRoot(skill.path, tree);
    const paths = new Set<string>();

    for (const entry of tree) {
      if (entry.type === 'tree') continue;
      const path = normalizePath(entry.path);
      if (isWithin(path, skill.path) || isPluginExtra(path, pluginRoot)) paths.add(path);
    }

    const files = [...paths]
      .map((path) => tree.find((entry) => normalizePath(entry.path) === path)!)
      .sort((a, b) => comparePaths(a.path, b.path));
    return {
      ...skill,
      files,
      nestedSkillPaths,
      totalBytes: files.reduce((total, file) => total + (file.size ?? 0), 0),
    };
  });

  return { skills: result };
}

function findPluginRoot(skillPath: string, tree: TreeEntry[]): string {
  const directories = ['', ...skillPath.split('/').map((_, index, parts) =>
    parts.slice(0, index + 1).join('/'),
  )].reverse();
  return directories.find((directory) => tree.some((entry) =>
    normalizePath(entry.path) === (directory
      ? `${directory}/.claude-plugin/plugin.json`
      : '.claude-plugin/plugin.json'),
  )) ?? '';
}

function isPluginExtra(path: string, pluginRoot: string): boolean {
  if (pluginRoot && !isWithin(path, pluginRoot)) return false;
  const relative = pluginRoot ? path.slice(pluginRoot.length + 1) : path;
  if (!relative) return false;
  return relative.startsWith('.claude-plugin/')
    || relative.startsWith('hooks/')
    || relative === '.mcp.json'
    || relative.startsWith('commands/')
    || relative.startsWith('agents/');
}

function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

function isWithin(path: string, directory: string): boolean {
  return directory === '' || path === directory || path.startsWith(`${directory}/`);
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
