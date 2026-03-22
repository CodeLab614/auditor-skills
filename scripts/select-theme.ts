#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  statSync,
} from 'node:fs';
import * as path from 'node:path';
import * as clack from '@clack/prompts';

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
  preview?: string;
  schema: 2;
  scopes: {
    auth?: { pages: string; components: string };
    dashboard?: { pages: string; components: string };
    landing?: { page: string; components?: string };
    styles?: { globals: string };
    layout?: { root: string };
  };
  dependencies?: Record<string, string>;
  assets?: Asset[];
}

interface Asset {
  source: string;
  destination: string;
}

type ThemeJson = ThemeJsonV1 | ThemeJsonV2;

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
  dashboard: {
    dirs: [
      path.join(ROOT_DIR, 'app', 'dashboard'),
      path.join(ROOT_DIR, 'components', 'dashboard'),
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

function parseGitHubSource(source: string): { owner: string; repo: string } {
  const parts = source.replace('github:', '').split('/');
  return { owner: parts[0], repo: parts[1] };
}

function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      mkdirSync(path.dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    }
  }
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count++;
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

/** Convert v1 theme.json to v2 format for uniform handling */
function normalizeThemeConfig(config: ThemeJson): ThemeJsonV2 {
  if (isV2(config)) return config;

  // Convert v1 → v2
  const v2: ThemeJsonV2 = {
    name: config.name,
    description: config.description,
    version: config.version,
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
          src: path.join(themeDir, config.scopes.auth.pages),
          dest: path.join(ROOT_DIR, 'app', 'auth'),
          type: 'dir',
        },
        {
          src: path.join(themeDir, config.scopes.auth.components),
          dest: path.join(ROOT_DIR, 'components', 'auth'),
          type: 'dir',
        },
      ],
    });
  }

  if (config.scopes.dashboard) {
    mappings.set('dashboard', {
      label: 'Dashboard pages & components',
      sources: [
        {
          src: path.join(themeDir, config.scopes.dashboard.pages),
          dest: path.join(ROOT_DIR, 'app', 'dashboard'),
          type: 'dir',
        },
        {
          src: path.join(themeDir, config.scopes.dashboard.components),
          dest: path.join(ROOT_DIR, 'components', 'dashboard'),
          type: 'dir',
        },
      ],
    });
  }

  if (config.scopes.landing) {
    const sources: ScopeMapping['sources'] = [
      {
        src: path.join(themeDir, config.scopes.landing.page),
        dest: path.join(ROOT_DIR, 'app', 'page.tsx'),
        type: 'file',
      },
    ];
    if (config.scopes.landing.components) {
      sources.push({
        src: path.join(themeDir, config.scopes.landing.components),
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
          src: path.join(themeDir, config.scopes.styles.globals),
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
          src: path.join(themeDir, config.scopes.layout.root),
          dest: path.join(ROOT_DIR, 'app', 'layout.tsx'),
          type: 'file',
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
        mkdirSync(path.dirname(dest), { recursive: true });
        cpSync(src, dest);
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
    const src = path.join(themeDir, asset.source);
    const dest = path.join(ROOT_DIR, asset.destination);

    if (existsSync(src)) {
      mkdirSync(path.dirname(dest), { recursive: true });
      cpSync(src, dest);
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

  const packages = deps.map((d) => `${d.name}@${d.version}`).join(' ');
  const { execSync } = await import('node:child_process');
  execSync(`bun add ${packages}`, { cwd: ROOT_DIR, stdio: 'pipe' });
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

  const { execSync } = await import('node:child_process');
  execSync(`tar -xzf "${tarballPath}" -C "${TEMP_DIR}"`, { stdio: 'pipe' });

  const extracted = readdirSync(TEMP_DIR).filter((f) => {
    const fullPath = path.join(TEMP_DIR, f);
    return statSync(fullPath).isDirectory();
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
// CLASSIC THEME (local install)
// ============================================================================

async function handleClassicInstall(): Promise<void> {
  const shouldRestore = await clack.confirm({
    message:
      'Install Classic theme? This will replace current files with the Classic default.',
  });

  if (clack.isCancel(shouldRestore) || !shouldRestore) {
    clack.cancel('No changes made.');
    process.exit(0);
  }

  const s = clack.spinner();

  // Read classic theme.json if it exists
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

  s.start('Installing Classic theme...');
  cleanScopes(scopeNames);
  const scopeResults = installScopes(mappings);
  s.stop('Classic theme installed.');

  for (const { scope, fileCount } of scopeResults) {
    const mapping = mappings.get(scope);
    clack.log.success(`${mapping?.label ?? scope} (${fileCount} files)`);
  }

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

    if (isNewToken) {
      saveEnvValue('GITHUB_TOKEN', token);
      clack.log.success('Token saved to .env.local');
    }

    // 3. Read and normalize theme.json
    const themeJsonPath = path.join(themeDir, 'theme.json');
    if (!existsSync(themeJsonPath)) {
      throw new Error('Theme is missing theme.json. Cannot install.');
    }

    const rawConfig = JSON.parse(readFileSync(themeJsonPath, 'utf-8')) as ThemeJson;
    const config = normalizeThemeConfig(rawConfig);
    const scopeNames = Object.keys(config.scopes);
    const mappings = resolveScopeMappings(themeDir, config);

    // 4. Show summary of what will be changed
    const scopeDescriptions: Record<string, string> = {
      auth: 'Login, register, and auth pages (app/auth/, components/auth/)',
      dashboard: 'Dashboard pages and components (app/dashboard/, components/dashboard/)',
      landing: 'Landing page (app/page.tsx)',
      styles: 'Global styles and CSS variables (app/globals.css)',
      layout: 'Root layout and fonts (app/layout.tsx)',
    };

    clack.note(
      scopeNames
        .map((scope) => `● ${scopeDescriptions[scope] ?? scope}`)
        .join('\n'),
      `"${config.name}" will modify`
    );

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

    // 6. Confirm
    const shouldContinue = await clack.confirm({
      message: `Install "${theme.name}" theme?`,
    });

    if (clack.isCancel(shouldContinue) || !shouldContinue) {
      clack.cancel('No changes made.');
      return;
    }

    // 7. Install scopes
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

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});