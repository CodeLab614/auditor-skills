import type { DetectedSkill, TreeEntry } from './detect-skills';

export type SubmissionSkillState =
  | 'new'
  | 'analyzed'
  | 'in-progress'
  | 'retired'
  | 'rejected';

export type SubmissionSkill = Pick<DetectedSkill, 'path' | 'name' | 'description'> & {
  state: SubmissionSkillState;
  target?: string;
  reason?: string;
};

export type SubmissionFileLimits = {
  maxFiles: number;
  maxTotalBytes: number;
  maxFileBytes: number;
};

export function getManifestPathsToRead(
  tree: TreeEntry[],
  basePath: string,
): string[] | { error: string } {
  const base = normalizePath(basePath);
  const paths = tree
    .filter((entry) => entry.type === 'blob'
      && (normalizePath(entry.path).endsWith('/SKILL.md')
        || normalizePath(entry.path) === 'SKILL.md'))
    .map((entry) => normalizePath(entry.path))
    .filter((path) => {
      const directory = parentPath(path);
      return isWithin(directory, base) || isWithin(base, directory);
    })
    .sort(comparePaths);

  if (paths.length > 50) {
    return { error: 'Esta ruta tiene demasiadas skills; envía una carpeta más concreta' };
  }
  return paths;
}

export function getSkillLimitReason(
  skill: Pick<DetectedSkill, 'files'>,
  limits: SubmissionFileLimits,
): string | undefined {
  if (skill.files.length > limits.maxFiles) {
    return `Supera el límite de ${limits.maxFiles} ${limits.maxFiles === 1 ? 'archivo' : 'archivos'}`;
  }
  const oversizedFile = skill.files.find((file) => (file.size ?? 0) > limits.maxFileBytes);
  if (oversizedFile) {
    return `Supera el límite de ${formatBytes(limits.maxFileBytes)} por archivo`;
  }
  const totalBytes = skill.files.reduce((total, file) => total + (file.size ?? 0), 0);
  if (totalBytes > limits.maxTotalBytes) {
    return `Supera el límite de ${formatBytes(limits.maxTotalBytes)} en total`;
  }
  return undefined;
}

export function generateSkillSlug(
  owner: string,
  repo: string,
  path: string,
  usedSlugs: ReadonlySet<string> = new Set(),
): string {
  const folder = normalizePath(path).split('/').at(-1) || 'root';
  const base = [owner, repo, folder]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!usedSlugs.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!usedSlugs.has(candidate)) return candidate;
  }
}

export function validateSelectedSkillPaths<
  TSkill extends { path: string; state: SubmissionSkillState },
>(
  paths: unknown,
  skills: readonly TSkill[],
): { ok: true; skills: TSkill[] } | { ok: false; message: string } {
  if (!Array.isArray(paths) || paths.length === 0) {
    return { ok: false, message: 'Selecciona al menos una skill' };
  }
  if (!paths.every((path): path is string => typeof path === 'string' && path.length > 0)) {
    return { ok: false, message: 'La selección de skills no es válida' };
  }
  if (new Set(paths).size !== paths.length) {
    return { ok: false, message: 'No puedes seleccionar la misma skill más de una vez' };
  }

  const skillsByPath = new Map(skills.map((skill) => [skill.path, skill]));
  const selected: TSkill[] = [];
  for (const path of paths) {
    const skill = skillsByPath.get(path);
    if (!skill || !['new', 'analyzed', 'in-progress'].includes(skill.state)) {
      return { ok: false, message: 'La selección contiene una skill no disponible' };
    }
    selected.push(skill);
  }
  return { ok: true, skills: selected };
}

export function needsSourceFiles(sourceFiles: unknown): boolean {
  return !Array.isArray(sourceFiles) || sourceFiles.length === 0;
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

function formatBytes(bytes: number): string {
  if (bytes % (1024 * 1024) === 0) return `${bytes / (1024 * 1024)} MB`;
  if (bytes % 1024 === 0) return `${bytes / 1024} KB`;
  return `${bytes} bytes`;
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
