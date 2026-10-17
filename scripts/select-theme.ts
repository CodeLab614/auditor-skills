#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  lstatSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as clack from '@clack/prompts';
import { z } from 'zod';
import { getThemeChangedPaths } from './lib/theme-safety';

// ============================================================================
// TYPES
// ============================================================================

interface RegistryTheme {
  id: string;
  name: string;
  description: string;
  preview: string;
  source: string;
  requiresToken: boolean;
}

interface Registry {
  themes: RegistryTheme[];
}

/** theme.json v1 — legacy format (Aurora <= 1.0.0) */
interface ThemeJsonV1 {
  name: string;
  description: string;
  version: string;
  preview?: string;
  files: {
    app: string;
    components: string;
    globals?: string;
    layout?: string;
  };
  assets?: Asset[];
}

/** theme.json v2 — scopes + dependencies */
interface ThemeJsonV2 {
  name: string;
  description: string;
  version: string;
  coreVersion: string;
  preview?: string;
  schema: 2;
  scopes: {
    auth?: { pages: string; components: string };
    landing?: { page: string; components?: string };
    styles?: { globals: string };
    layout?: { root: string };
    ui?: { components: string };
  };
  dependencies?: Record<string, string>;
  assets?: Asset[];
}

interface Asset {
  source: string;
  destination: string;
}

type ThemeJson = ThemeJsonV1 | ThemeJsonV2;

const relativePathSchema = z.string().min(1).refine(
  (value) => !path.isAbsolute(value) && !path.win32.isAbsolute(value) && !value.includes('\0'),
  'must be a relative path'
);

const assetSchema = z.object({
  source: relativePathSchema,
  destination: relativePathSchema,
}).strict();

const dependenciesSchema = z.record(
  z.string().regex(
    /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
  ).refine((name) => name.split('/').every((part) => part !== '.' && part !== '..') && name.length <= 214,
    'must be a valid npm package name'),
  z.string().regex(
    /^(?:\^|~|>=?|<=?|=)?v?(?:\d+|[xX*])(?:\.(?:\d+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
    'must be a semver version or a simple semver range without spaces'
  )
);

const themeJsonV1Schema = z.object({
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  coreVersion: z.string().min(1),
  preview: z.string().optional(),
  files: z.object({
    app: relativePathSchema,
    components: relativePathSchema,
    globals: relativePathSchema.optional(),
    layout: relativePathSchema.optional(),
  }).strict(),
  assets: z.array(assetSchema).optional(),
}).strict();

const themeJsonV2Schema = z.object({
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  coreVersion: z.string().min(1),
  preview: z.string().optional(),
  schema: z.literal(2),
  scopes: z.object({
    auth: z.object({ pages: relativePathSchema, components: relativePathSchema }).strict().optional(),
    landing: z.object({ page: relativePathSchema, components: relativePathSchema.optional() }).strict().optional(),
    styles: z.object({ globals: relativePathSchema }).strict().optional(),
    layout: z.object({ root: relativePathSchema }).strict().optional(),
    ui: z.object({ components: relativePathSchema }).strict().optional(),
  }).strict().refine((scopes) => Object.keys(scopes).length > 0, 'must define at least one scope'),
  dependencies: dependenciesSchema.optional(),
  assets: z.array(assetSchema).optional(),
}).strict();

const themeJsonSchema = z.union([themeJsonV1Schema, themeJsonV2Schema]);

interface ScopeMapping {
  label: string;
  sources: { src: string; dest: string; type: 'dir' | 'file' }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const REGISTRY_PATH = path.join(ROOT_DIR, 'themes', 'registry.json');
const CLASSIC_BACKUP_DIR = path.join(ROOT_DIR, 'themes', 'classic');
const ENV_LOCAL_PATH = path.join(ROOT_DIR, '.env.local');
const TEMP_DIR = path.join(ROOT_DIR, '.theme-temp');
const NEXT_CACHE_DIR = path.join(ROOT_DIR, '.next');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');

// Scope target paths (where files live in the CLI project)
const SCOPE_TARGETS: Record<string, { dirs: string[]; files: string[] }> = {
  auth: {
    dirs: [
      path.join(ROOT_DIR, 'app', 'auth'),
      path.join(ROOT_DIR, 'components', 'auth'),
    ],
    files: [],
  },
  landing: {
    dirs: [],
    files: [
      path.join(ROOT_DIR, 'app', 'page.tsx'),
      path.join(ROOT_DIR, 'components', 'landing-content.tsx'),
    ],
  },
  styles: {
    dirs: [],
    files: [
      path.join(ROOT_DIR, 'app', 'globals.css'),
    ],
  },
  layout: {
    dirs: [],
    files: [
      path.join(ROOT_DIR, 'app', 'layout.tsx'),
    ],
  },
  ui: {
    dirs: [
      path.join(ROOT_DIR, 'components', 'ui'),
    ],
    files: [],
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

function readRegistry(): Registry {
  const content = readFileSync(REGISTRY_PATH, 'utf-8');
  return JSON.parse(content) as Registry;
}

function getEnvValue(key: string): string | null {
  if (!existsSync(ENV_LOCAL_PATH)) return null;
  const content = readFileSync(ENV_LOCAL_PATH, 'utf-8');
  const match = content.match(new RegExp(`^${key}="?([^"\\n]*)"?`, 'm'));
  return match ? match[1] : null;
}

function saveEnvValue(key: string, value: string): void {
  let content = '';
  if (existsSync(ENV_LOCAL_PATH)) {
    content = readFileSync(ENV_LOCAL_PATH, 'utf-8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}="${value}"`);
  } else {
    if (content.length > 0 && !content.endsWith('\n')) {
      content += '\n';
    }
    content += `\n${key}="${value}"`;
  }

  writeFileSync(ENV_LOCAL_PATH, content);
}

function resolveContainedPath(base: string, relativePath: string, label: string): string {
  if (path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
    throw new Error(`${label} must be a relative path: ${relativePath}`);
  }

  const resolvedBase = path.resolve(base);
  const resolvedPath = path.resolve(resolvedBase, relativePath);
  if (
    resolvedPath !== resolvedBase &&
    !resolvedPath.startsWith(`${resolvedBase}${path.sep}`)
  ) {
    throw new Error(`${label} resolves outside its allowed directory: ${relativePath}`);
  }
  return resolvedPath;
}

function assertNoSymlinks(sourcePath: string): void {
  let stat;
  try {
    stat = lstatSync(sourcePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }

  if (stat.isSymbolicLink()) {
    throw new Error(`Theme contains a symbolic link: ${sourcePath}`);
  }
  if (stat.isDirectory()) {
    for (const entry of readdirSync(sourcePath)) {
      assertNoSymlinks(path.join(sourcePath, entry));
    }
  }
}

function assertNoSymlinkPathComponents(base: string, sourcePath: string): void {
  const relativeSource = path.relative(base, sourcePath);
  let currentPath = base;
  for (const segment of relativeSource.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    let stat;
    try {
      stat = lstatSync(currentPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Theme contains a symbolic link: ${currentPath}`);
    }
  }
  assertNoSymlinks(sourcePath);
}

function assertThemeSourceType(
  sourcePath: string,
  type: 'dir' | 'file',
  label: string
): void {
  let stat;
  try {
    stat = lstatSync(sourcePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${label} does not exist in the theme: ${sourcePath}`);
    }
    throw error;
  }

  if ((type === 'dir' && !stat.isDirectory()) || (type === 'file' && !stat.isFile())) {
    throw new Error(`${label} must be a ${type === 'dir' ? 'directory' : 'regular file'}: ${sourcePath}`);
  }
}

function copyFileNoSymlink(sourcePath: string, destinationPath: string): void {
  const stat = lstatSync(sourcePath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Expected a regular file in theme source: ${sourcePath}`);
  }
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  cpSync(sourcePath, destinationPath);
}

function assertSafeAssetDestination(destination: string): void {
  const relativeDestination = path.relative(ROOT_DIR, destination);
  const segments = relativeDestination.split(path.sep);
  if (segments.some((segment) => {
    const normalizedSegment = segment.toLowerCase();
    return normalizedSegment === '.git' ||
      normalizedSegment === 'node_modules' ||
      normalizedSegment.startsWith('.env') ||
      normalizedSegment === 'package.json' ||
      normalizedSegment === 'bun.lock' ||
      normalizedSegment === 'bun.lockb';
  })) {
    throw new Error(`Asset destination targets a protected project path: ${relativeDestination}`);
  }

  let currentPath = ROOT_DIR;
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    try {
      if (lstatSync(currentPath).isSymbolicLink()) {
        throw new Error(`Asset destination traverses a symbolic link: ${currentPath}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }
}

/** Read, validate, and check all source and asset paths before installation. */
export function validateThemeConfig(themeDir: string): ThemeJsonV2 {
  const resolvedThemeDir = path.resolve(themeDir);
  if (lstatSync(resolvedThemeDir).isSymbolicLink()) {
    throw new Error('Theme directory cannot be a symbolic link.');
  }
  const themeJsonPath = resolveContainedPath(resolvedThemeDir, 'theme.json', 'theme.json');
  if (!existsSync(themeJsonPath)) {
    throw new Error('Theme is missing theme.json. Cannot install.');
  }
  const themeJsonStat = lstatSync(themeJsonPath);
  if (themeJsonStat.isSymbolicLink() || !themeJsonStat.isFile()) {
    throw new Error('Theme theme.json must be a regular file, not a symbolic link.');
  }

  const rawConfig: unknown = JSON.parse(readFileSync(themeJsonPath, 'utf-8'));
  if (rawConfig && typeof rawConfig === 'object' && 'scopes' in rawConfig && rawConfig.scopes && typeof rawConfig.scopes === 'object' && 'dashboard' in rawConfig.scopes) {
    throw new Error('Themes cannot declare the dashboard scope. The dashboard contains application code and is never replaced by themes. Ask the theme author to remove that scope.');
  }
  const rawCoreVersion = rawConfig && typeof rawConfig === 'object' && 'coreVersion' in rawConfig ? rawConfig.coreVersion : undefined;
  if (typeof rawCoreVersion !== 'string' || !isCoreVersionCompatible(rawCoreVersion)) {
    throw new Error(`Theme "${rawConfig && typeof rawConfig === 'object' && 'name' in rawConfig ? String(rawConfig.name) : 'Unknown'}" is for a different RapidAuth version (requires a compatible coreVersion; current version is ${CURRENT_CORE_VERSION}). Ask the theme author to update it.`);
  }
  const parsedConfig = themeJsonSchema.safeParse(rawConfig);
  if (!parsedConfig.success) {
    const details = parsedConfig.error.issues
      .map((issue) => `${issue.path.join('.') || 'theme.json'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid theme.json: ${details}`);
  }

  const config = normalizeThemeConfig(parsedConfig.data as ThemeJson);
  const mappings = resolveScopeMappings(resolvedThemeDir, config);
  for (const mapping of mappings.values()) {
    for (const { src, type } of mapping.sources) {
      assertNoSymlinkPathComponents(resolvedThemeDir, src);
      assertThemeSourceType(src, type, mapping.label);
    }
  }

  for (const asset of config.assets ?? []) {
    const source = resolveContainedPath(resolvedThemeDir, asset.source, 'Asset source');
    const destination = resolveContainedPath(ROOT_DIR, asset.destination, 'Asset destination');
    assertNoSymlinkPathComponents(resolvedThemeDir, source);
    assertThemeSourceType(source, 'file', 'Asset source');
    assertSafeAssetDestination(destination);
  }

  return config;
}

function parseGitHubSource(source: string): { owner: string; repo: string } {
  const parts = source.replace('github:', '').split('/');
  return { owner: parts[0], repo: parts[1] };
}

function copyDirRecursive(src: string, dest: string): void {
  let stat;
  try {
    stat = lstatSync(src);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`Symbolic links are not allowed in theme sources: ${src}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`Expected a directory in theme source: ${src}`);
  }
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const entryStat = lstatSync(srcPath);

    if (entryStat.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in theme sources: ${srcPath}`);
    }
    if (entryStat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entryStat.isFile()) {
      mkdirSync(path.dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    } else {
      throw new Error(`Unsupported theme source entry: ${srcPath}`);
    }
  }
}

function countFiles(dir: string): number {
  let stat;
  try {
    stat = lstatSync(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`Symbolic links are not allowed in copied files: ${dir}`);
  }
  if (!stat.isDirectory()) return 1;
  let count = 0;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const entryStat = lstatSync(fullPath);
    if (entryStat.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in copied files: ${fullPath}`);
    }
    if (entryStat.isDirectory()) {
      count += countFiles(fullPath);
    } else if (entryStat.isFile()) {
      count++;
    } else {
      throw new Error(`Unsupported copied file entry: ${fullPath}`);
    }
  }
  return count;
}

// ============================================================================
// THEME.JSON PARSING (v1 → v2 compatibility)
// ============================================================================

function isV2(config: ThemeJson): config is ThemeJsonV2 {
  return 'schema' in config && config.schema === 2;
}

const CURRENT_CORE_VERSION = (JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8')) as { version: string }).version;

// Oldest core a theme may target. 0.2.0 moved Turnstile and the email verification flow into
// the auth pages, so themes built before it would silently remove them. Raise it on breaking changes.
const MIN_THEME_CORE_VERSION = '0.2.0';

function compareVersions(a: string, b: string): number | null {
  const left = a.match(/^(\d+)\.(\d+)\.(\d+)$/);
  const right = b.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!left || !right) return null;
  for (let index = 1; index <= 3; index++) {
    const difference = Number(left[index]) - Number(right[index]);
    if (difference !== 0) return difference;
  }
  return 0;
}

function isCoreVersionCompatible(range: string): boolean {
  const required = range.trim().match(/^>=\s*(\d+\.\d+\.\d+)$/)?.[1];
  if (!required) return false;
  const atLeastMinimum = compareVersions(required, MIN_THEME_CORE_VERSION);
  const notAboveCurrent = compareVersions(required, CURRENT_CORE_VERSION);
  return atLeastMinimum !== null && atLeastMinimum >= 0 && notAboveCurrent !== null && notAboveCurrent <= 0;
}

/** Convert v1 theme.json to v2 format for uniform handling */
function normalizeThemeConfig(config: ThemeJson): ThemeJsonV2 {
  if (isV2(config)) return config;

  // Convert v1 → v2
  const v2: ThemeJsonV2 = {
    name: config.name,
    description: config.description,
    version: config.version,
    coreVersion: `>=${CURRENT_CORE_VERSION}`,
    preview: config.preview,
    schema: 2,
    scopes: {
      auth: {
        pages: config.files.app,
        components: config.files.components,
      },
    },
    assets: config.assets,
  };

  if (config.files.globals) {
    v2.scopes.styles = {
      globals: config.files.globals,
    };
  }

  if (config.files.layout) {
    v2.scopes.layout = {
      root: config.files.layout,
    };
  }

  return v2;
}

// ============================================================================
// SCOPE RESOLUTION
// ============================================================================

/** Build a mapping of what to copy from theme dir to project, per scope */
function resolveScopeMappings(
  themeDir: string,
  config: ThemeJsonV2
): Map<string, ScopeMapping> {
  const mappings = new Map<string, ScopeMapping>();

  if (config.scopes.auth) {
    mappings.set('auth', {
      label: 'Auth pages & components',
      sources: [
        {
          src: resolveContainedPath(themeDir, config.scopes.auth.pages, 'Auth pages source'),
          dest: path.join(ROOT_DIR, 'app', 'auth'),
          type: 'dir',
        },
        {
          src: resolveContainedPath(themeDir, config.scopes.auth.components, 'Auth components source'),
          dest: path.join(ROOT_DIR, 'components', 'auth'),
          type: 'dir',
        },
      ],
    });
  }

  if (config.scopes.landing) {
    const sources: ScopeMapping['sources'] = [
      {
        src: resolveContainedPath(themeDir, config.scopes.landing.page, 'Landing page source'),
        dest: path.join(ROOT_DIR, 'app', 'page.tsx'),
        type: 'file',
      },
    ];
    if (config.scopes.landing.components) {
      sources.push({
        src: resolveContainedPath(themeDir, config.scopes.landing.components, 'Landing components source'),
        dest: path.join(ROOT_DIR, 'components', 'landing-content.tsx'),
        type: 'file',
      });
    }
    mappings.set('landing', {
      label: 'Landing page',
      sources,
    });
  }

  if (config.scopes.styles) {
    mappings.set('styles', {
      label: 'Global styles',
      sources: [
        {
          src: resolveContainedPath(themeDir, config.scopes.styles.globals, 'Styles source'),
          dest: path.join(ROOT_DIR, 'app', 'globals.css'),
          type: 'file',
        },
      ],
    });
  }

  if (config.scopes.layout) {
    mappings.set('layout', {
      label: 'Root layout',
      sources: [
        {
          src: resolveContainedPath(themeDir, config.scopes.layout.root, 'Layout source'),
          dest: path.join(ROOT_DIR, 'app', 'layout.tsx'),
          type: 'file',
        },
      ],
    });
  }

  if (config.scopes.ui) {
    mappings.set('ui', {
      label: 'UI components (shadcn)',
      sources: [
        {
          src: resolveContainedPath(themeDir, config.scopes.ui.components, 'UI components source'),
          dest: path.join(ROOT_DIR, 'components', 'ui'),
          type: 'dir',
        },
      ],
    });
  }

  return mappings;
}

// ============================================================================
// INSTALLATION
// ============================================================================

function cleanScopes(scopeNames: string[]): void {
  for (const scope of scopeNames) {
    const targets = SCOPE_TARGETS[scope];
    if (!targets) continue;

    for (const dir of targets.dirs) {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
    }
  }
}

function relativeTarget(absolutePath: string): string {
  return path.relative(ROOT_DIR, absolutePath).split(path.sep).join('/');
}

function pathsForScopes(scopeNames: string[], extraPaths: string[] = []): string[] {
  const paths = new Set<string>(extraPaths);
  for (const scope of scopeNames) {
    const targets = SCOPE_TARGETS[scope];
    if (!targets) continue;
    for (const target of [...targets.dirs, ...targets.files]) paths.add(relativeTarget(target));
  }
  return [...paths].sort();
}

function showAffectedPaths(paths: string[]): void {
  clack.note(paths.map((item) => `• ${item}`).join('\n'), 'Directories and files to replace');
}

async function confirmReplacement(themeName: string, paths: string[]): Promise<boolean> {
  showAffectedPaths(paths);
  const changed = getThemeChangedPaths(paths);
  if (changed.length) {
    clack.log.warn('Changes detected in the paths listed below:');
    for (const item of changed) clack.log.message(`  ${item}`);
    const typedName = await clack.text({
      message: `Type "${themeName}" to confirm replacing these paths`,
      placeholder: themeName,
      validate: (value) => value === themeName ? undefined : `Type ${themeName} exactly to continue.`,
    });
    return !clack.isCancel(typedName) && typedName === themeName;
  }
  const accepted = await clack.confirm({ message: `Install "${themeName}" and replace the listed paths?` });
  return !clack.isCancel(accepted) && accepted;
}

function backupPaths(paths: string[]): string {
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const backupRoot = path.join(ROOT_DIR, '.theme-backups', timestamp);
  mkdirSync(backupRoot, { recursive: true });
  const backedUp: string[] = [];
  for (const relative of paths) {
    const source = path.join(ROOT_DIR, relative);
    if (!existsSync(source)) continue;
    const destination = path.join(backupRoot, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true, dereference: false });
    backedUp.push(relative);
  }
  clack.log.success(`Backup saved to ${path.relative(ROOT_DIR, backupRoot)}/`);
  clack.log.info('Restore the saved paths from the project root with:');
  for (const relative of backedUp) {
    const parent = path.posix.dirname(relative);
    clack.log.message(`  cp -R ${path.relative(ROOT_DIR, backupRoot)}/${relative} ${parent === '.' ? '.' : `${parent}/`}`);
  }
  return backupRoot;
}

function installScopes(
  mappings: Map<string, ScopeMapping>
): { scope: string; fileCount: number }[] {
  const results: { scope: string; fileCount: number }[] = [];

  for (const [scope, mapping] of mappings) {
    let fileCount = 0;

    for (const { src, dest, type } of mapping.sources) {
      if (!existsSync(src)) continue;

      if (type === 'dir') {
        copyDirRecursive(src, dest);
        fileCount += countFiles(dest);
      } else {
        copyFileNoSymlink(src, dest);
        fileCount++;
      }
    }

    results.push({ scope, fileCount });
  }

  return results;
}

function installAssets(themeDir: string, assets?: Asset[]): number {
  if (!assets || assets.length === 0) return 0;

  let count = 0;
  for (const asset of assets) {
    const src = resolveContainedPath(themeDir, asset.source, 'Asset source');
    const dest = resolveContainedPath(ROOT_DIR, asset.destination, 'Asset destination');

    if (existsSync(src)) {
      copyFileNoSymlink(src, dest);
      count++;
    }
  }
  return count;
}

// ============================================================================
// DEPENDENCY MANAGEMENT
// ============================================================================

function getInstalledDependencies(): Record<string, string> {
  if (!existsSync(PACKAGE_JSON_PATH)) return {};
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

function findMissingDependencies(
  required: Record<string, string>
): { name: string; version: string }[] {
  const installed = getInstalledDependencies();
  const missing: { name: string; version: string }[] = [];

  for (const [name, version] of Object.entries(required)) {
    if (!installed[name]) {
      missing.push({ name, version });
    }
  }

  return missing;
}

async function installDependencies(
  deps: { name: string; version: string }[]
): Promise<void> {
  if (deps.length === 0) return;

  const packages = deps.map((dependency) => `${dependency.name}@${dependency.version}`);
  execFileSync('bun', ['add', ...packages], { cwd: ROOT_DIR, stdio: 'pipe' });
}

// ============================================================================
// GITHUB DOWNLOAD
// ============================================================================

async function downloadAndExtractTarball(
  owner: string,
  repo: string,
  token: string
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/tarball/main`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'rapidauth-theme-installer',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Invalid or expired GitHub token. Please check your token and try again.'
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Theme repository "${owner}/${repo}" not found. Check the registry configuration.`
      );
    }
    throw new Error(
      `Failed to download theme: ${response.status} ${response.statusText}`
    );
  }

  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true });
  }
  mkdirSync(TEMP_DIR, { recursive: true });

  const arrayBuffer = await response.arrayBuffer();
  const tarballPath = path.join(TEMP_DIR, 'theme.tar.gz');
  writeFileSync(tarballPath, Buffer.from(arrayBuffer));

  execFileSync('tar', ['-xzf', tarballPath, '-C', TEMP_DIR], { stdio: 'pipe' });

  const extracted = readdirSync(TEMP_DIR).filter((f) => {
    const fullPath = path.join(TEMP_DIR, f);
    const stat = lstatSync(fullPath);
    return !stat.isSymbolicLink() && stat.isDirectory();
  });

  if (extracted.length === 0) {
    throw new Error('Failed to extract theme files from tarball.');
  }

  return path.join(TEMP_DIR, extracted[0]);
}

// ============================================================================
// CACHE & CLEANUP
// ============================================================================

function clearNextCache(): void {
  if (existsSync(NEXT_CACHE_DIR)) {
    rmSync(NEXT_CACHE_DIR, { recursive: true });
  }
}

function cleanup(): void {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true });
  }
}

// ============================================================================
// CLASSIC RESTORE (reusable)
// ============================================================================

/** Restore all scopes to Classic defaults. Used before installing any theme. */
function restoreClassic(): void {
  const classicThemeJsonPath = path.join(CLASSIC_BACKUP_DIR, 'theme.json');
  let config: ThemeJsonV2;

  if (existsSync(classicThemeJsonPath)) {
    const raw = JSON.parse(readFileSync(classicThemeJsonPath, 'utf-8')) as ThemeJson;
    config = normalizeThemeConfig(raw);
  } else {
    config = {
      name: 'Classic',
      description: 'Default theme',
      version: '1.0.0',
      coreVersion: '>=0.2.0',
      schema: 2,
      scopes: {
        auth: { pages: 'app/auth', components: 'components/auth' },
        styles: { globals: 'app/globals.css' },
        layout: { root: 'app/layout.tsx' },
      },
    };
  }

  const scopeNames = Object.keys(config.scopes);
  const mappings = resolveScopeMappings(CLASSIC_BACKUP_DIR, config);
  cleanScopes(scopeNames);
  installScopes(mappings);
}

// ============================================================================
// CLASSIC THEME (local install)
// ============================================================================

async function handleClassicInstall(): Promise<void> {
  const paths = pathsForScopes(Object.keys(SCOPE_TARGETS));
  const shouldRestore = await confirmReplacement('Classic', paths);
  if (!shouldRestore) {
    clack.cancel('No changes made.');
    return;
  }

  backupPaths(paths);
  const s = clack.spinner();

  s.start('Restoring Classic theme...');
  restoreClassic();
  s.stop('Classic theme installed.');

  clearNextCache();
  clack.log.success('Cleared .next/ cache');
  clack.outro('Done! Run `bun dev` to see your auth pages.');
}

// ============================================================================
// GITHUB THEME INSTALLATION
// ============================================================================

async function handleGitHubTheme(theme: RegistryTheme): Promise<void> {
  // 1. Get token
  let token = getEnvValue('GITHUB_TOKEN');
  let isNewToken = false;

  if (!token) {
    const tokenInput = await clack.text({
      message: 'Enter your GitHub personal access token',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Token is required to download themes from GitHub.';
        }
        if (
          !value.startsWith('ghp_') &&
          !value.startsWith('github_pat_')
        ) {
          return 'Token should start with "ghp_" or "github_pat_"';
        }
      },
    });

    if (clack.isCancel(tokenInput)) {
      clack.cancel('Theme selection cancelled.');
      process.exit(0);
    }

    token = tokenInput as string;
    isNewToken = true;
  } else {
    clack.log.info('Using GitHub token from .env.local');
  }

  // 2. Download
  const { owner, repo } = parseGitHubSource(theme.source);
  const s = clack.spinner();

  try {
    s.start(`Downloading "${theme.name}" from GitHub...`);
    const themeDir = await downloadAndExtractTarball(owner, repo, token);
    s.stop('Downloaded theme files.');

    // 3. Validate theme.json, all paths, and source trees before confirmation.
    const config = validateThemeConfig(themeDir);
    const scopeNames = Object.keys(config.scopes);
    const mappings = resolveScopeMappings(themeDir, config);

    // 4. Show summary of what will be changed
    const scopeDescriptions: Record<string, string> = {
      auth: 'Login, register, and auth pages (app/auth/, components/auth/)',
      landing: 'Landing page (app/page.tsx)',
      styles: 'Global styles and CSS variables (app/globals.css)',
      layout: 'Root layout and fonts (app/layout.tsx)',
      ui: 'UI components — shadcn (components/ui/)',
    };

    clack.note(
      scopeNames
        .map((scope) => `● ${scopeDescriptions[scope] ?? scope}`)
        .join('\n'),
      `"${config.name}" will modify`
    );

    if (config.assets && config.assets.length > 0) {
      clack.note(
        config.assets
          .map((asset) => {
            const source = resolveContainedPath(themeDir, asset.source, 'Asset source');
            const destination = resolveContainedPath(ROOT_DIR, asset.destination, 'Asset destination');
            return `${source} → ${destination}`;
          })
          .join('\n'),
        'Assets to copy (source → destination)'
      );
    }

    // 5. Check dependencies
    const missingDeps = config.dependencies
      ? findMissingDependencies(config.dependencies)
      : [];

    if (missingDeps.length > 0) {
      clack.log.info('New dependencies to install:');
      for (const dep of missingDeps) {
        clack.log.message(`  ${dep.name}@${dep.version}`);
      }
    }

    const affected = pathsForScopes([...new Set([...Object.keys(SCOPE_TARGETS), ...scopeNames])], [
      ...[...mappings.values()].flatMap((mapping) => mapping.sources.map(({ dest }) => relativeTarget(dest))),
      ...(config.assets ?? []).map((asset) => relativeTarget(resolveContainedPath(ROOT_DIR, asset.destination, 'Asset destination'))),
    ]);
    const shouldContinue = await confirmReplacement(theme.name, affected);
    if (!shouldContinue) {
      clack.cancel('No changes made.');
      return;
    }

    backupPaths(affected);

    if (isNewToken) {
      saveEnvValue('GITHUB_TOKEN', token);
      clack.log.success('Token saved to .env.local');
    }

    // 7. Restore Classic first (clean slate)
    s.start('Restoring defaults...');
    restoreClassic();
    s.stop('Defaults restored.');

    // 8. Install theme scopes
    s.start('Installing theme files...');
    cleanScopes(scopeNames);
    const scopeResults = installScopes(mappings);
    s.stop('Theme files installed.');

    for (const { scope, fileCount } of scopeResults) {
      const mapping = mappings.get(scope);
      clack.log.success(`${mapping?.label ?? scope} (${fileCount} files)`);
    }

    // 8. Install assets
    if (config.assets && config.assets.length > 0) {
      const assetCount = installAssets(themeDir, config.assets);
      if (assetCount > 0) {
        clack.log.success(`Copied ${assetCount} asset(s)`);
      }
    }

    // 9. Install dependencies
    if (missingDeps.length > 0) {
      s.start(`Installing ${missingDeps.length} dependencie(s)...`);
      await installDependencies(missingDeps);
      s.stop('Dependencies installed.');
      for (const dep of missingDeps) {
        clack.log.success(`Added ${dep.name}@${dep.version}`);
      }
    }

    // 10. Clear cache
    clearNextCache();
    clack.log.success('Cleared .next/ cache');

    clack.outro(
      `Done! "${theme.name}" theme installed. Run \`bun dev\` to see your auth pages.`
    );
  } catch (error) {
    s.stop('Failed.');
    clack.log.error(
      error instanceof Error ? error.message : 'An unknown error occurred.'
    );
    clack.outro('Theme installation failed.');
    process.exit(1);
  } finally {
    cleanup();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('An interactive terminal is required. No changes were made.');
    process.exitCode = 1;
    return;
  }

  clack.intro('RapidAuth Theme Selector');

  const registry = readRegistry();

  const selectedId = await clack.select({
    message: 'Select a theme',
    options: registry.themes.map((theme) => ({
      value: theme.id,
      label: `${theme.name}${theme.requiresToken ? '' : ' (default)'}`,
      hint: theme.description,
    })),
  });

  if (clack.isCancel(selectedId)) {
    clack.cancel('Theme selection cancelled.');
    process.exit(0);
  }

  const theme = registry.themes.find((t) => t.id === selectedId)!;

  // Show preview URL so the user can check the theme before installing
  if (theme.preview) {
    clack.log.info(`Preview: ${theme.preview}`);
  }

  if (theme.source === 'local') {
    await handleClassicInstall();
    return;
  }

  await handleGitHubTheme(theme);
}

if ((import.meta as ImportMeta & { main?: boolean }).main) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
