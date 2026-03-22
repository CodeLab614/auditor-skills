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

interface Theme {
  id: string;
  name: string;
  description: string;
  preview: string;
  source: string;
  requiresToken: boolean;
}

interface Registry {
  themes: Theme[];
}

interface ThemeJson {
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
  assets?: Array<{
    source: string;
    destination: string;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const REGISTRY_PATH = path.join(ROOT_DIR, 'themes', 'registry.json');
const CLASSIC_BACKUP_DIR = path.join(ROOT_DIR, 'themes', 'classic');
const ENV_LOCAL_PATH = path.join(ROOT_DIR, '.env.local');
const APP_AUTH_DIR = path.join(ROOT_DIR, 'app', 'auth');
const COMPONENTS_AUTH_DIR = path.join(ROOT_DIR, 'components', 'auth');
const GLOBALS_CSS_PATH = path.join(ROOT_DIR, 'app', 'globals.css');
const ROOT_LAYOUT_PATH = path.join(ROOT_DIR, 'app', 'layout.tsx');
const TEMP_DIR = path.join(ROOT_DIR, '.theme-temp');
const NEXT_CACHE_DIR = path.join(ROOT_DIR, '.next');

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

  // Check if key already exists
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}="${value}"`);
  } else {
    // Add with a blank line separator if content exists
    if (content.length > 0 && !content.endsWith('\n')) {
      content += '\n';
    }
    content += `\n${key}="${value}"`;
  }

  writeFileSync(ENV_LOCAL_PATH, content);
}

function parseGitHubSource(source: string): { owner: string; repo: string } {
  // source format: "github:OWNER/REPO"
  const parts = source.replace('github:', '').split('/');
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Recursively copy a directory, creating parent dirs as needed.
 */
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
      // Ensure parent dir exists
      mkdirSync(path.dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    }
  }
}

/**
 * Count files recursively in a directory.
 */
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

  // Clean up any previous temp directory
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true });
  }
  mkdirSync(TEMP_DIR, { recursive: true });

  // Write the tarball to a temp file and extract
  const arrayBuffer = await response.arrayBuffer();
  const tarballPath = path.join(TEMP_DIR, 'theme.tar.gz');
  writeFileSync(tarballPath, Buffer.from(arrayBuffer));

  // Extract using tar command (available on macOS/Linux)
  const { execSync } = await import('node:child_process');
  execSync(`tar -xzf "${tarballPath}" -C "${TEMP_DIR}"`, { stdio: 'pipe' });

  // Find the extracted directory (GitHub adds a prefix like "owner-repo-hash/")
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
// THEME INSTALLATION
// ============================================================================

function cleanAuthDirs(): void {
  // Remove all contents of app/auth/ and components/auth/
  if (existsSync(APP_AUTH_DIR)) {
    rmSync(APP_AUTH_DIR, { recursive: true });
  }
  if (existsSync(COMPONENTS_AUTH_DIR)) {
    rmSync(COMPONENTS_AUTH_DIR, { recursive: true });
  }
}

function installFromLocal(themeDir: string, themeConfig?: ThemeJson | null): { appFiles: number; componentFiles: number; globalsReplaced: boolean; layoutReplaced: boolean } {
  const srcApp = path.join(themeDir, 'app', 'auth');
  const srcComponents = path.join(themeDir, 'components', 'auth');

  copyDirRecursive(srcApp, APP_AUTH_DIR);
  copyDirRecursive(srcComponents, COMPONENTS_AUTH_DIR);

  // Copy globals.css if the theme includes one
  let globalsReplaced = false;
  const globalsFile = themeConfig?.files?.globals;
  if (globalsFile) {
    const srcGlobals = path.join(themeDir, globalsFile);
    if (existsSync(srcGlobals)) {
      cpSync(srcGlobals, GLOBALS_CSS_PATH);
      globalsReplaced = true;
    }
  } else {
    // Check default location
    const defaultGlobals = path.join(themeDir, 'app', 'globals.css');
    if (existsSync(defaultGlobals)) {
      cpSync(defaultGlobals, GLOBALS_CSS_PATH);
      globalsReplaced = true;
    }
  }

  // Copy layout.tsx if the theme includes one
  let layoutReplaced = false;
  const layoutFile = themeConfig?.files?.layout;
  if (layoutFile) {
    const srcLayout = path.join(themeDir, layoutFile);
    if (existsSync(srcLayout)) {
      cpSync(srcLayout, ROOT_LAYOUT_PATH);
      layoutReplaced = true;
    }
  } else {
    // Check default location
    const defaultLayout = path.join(themeDir, 'app', 'layout.tsx');
    if (existsSync(defaultLayout)) {
      cpSync(defaultLayout, ROOT_LAYOUT_PATH);
      layoutReplaced = true;
    }
  }

  return {
    appFiles: countFiles(APP_AUTH_DIR),
    componentFiles: countFiles(COMPONENTS_AUTH_DIR),
    globalsReplaced,
    layoutReplaced,
  };
}

function installAssets(
  themeDir: string,
  assets: ThemeJson['assets']
): number {
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
// MAIN
// ============================================================================

async function main() {
  clack.intro('RapidAuth Theme Selector');

  // 1. Read registry
  const registry = readRegistry();

  // 2. Select theme
  const selectedId = await clack.select({
    message: 'Select an auth theme',
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

  // 3. Handle Classic (local) theme
  if (theme.source === 'local') {
    const shouldRestore = await clack.confirm({
      message:
        'Restore Classic theme? This will replace current auth files with the Classic default.',
    });

    if (clack.isCancel(shouldRestore) || !shouldRestore) {
      clack.cancel('No changes made.');
      process.exit(0);
    }

    const s = clack.spinner();
    s.start('Restoring Classic theme...');

    cleanAuthDirs();
    const { appFiles, componentFiles, globalsReplaced, layoutReplaced } = installFromLocal(CLASSIC_BACKUP_DIR);

    s.stop('Classic theme restored.');
    clack.log.success(`Replaced app/auth/ (${appFiles} files)`);
    clack.log.success(`Replaced components/auth/ (${componentFiles} files)`);
    if (globalsReplaced) {
      clack.log.success('Restored globals.css');
    }
    if (layoutReplaced) {
      clack.log.success('Restored app/layout.tsx');
    }
    clearNextCache();
    clack.log.success('Cleared .next/ cache');
    clack.outro('Done! Run `bun dev` to see your auth pages.');
    return;
  }

  // 4. Handle GitHub theme — get token
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

  // 5. Confirm before overwriting
  const shouldContinue = await clack.confirm({
    message: `Install "${theme.name}" theme? This will replace all files in app/auth/ and components/auth/.`,
  });

  if (clack.isCancel(shouldContinue) || !shouldContinue) {
    clack.cancel('No changes made.');
    process.exit(0);
  }

  // 6. Download from GitHub
  const { owner, repo } = parseGitHubSource(theme.source);
  const s = clack.spinner();

  try {
    s.start(`Downloading "${theme.name}" from GitHub...`);
    const themeDir = await downloadAndExtractTarball(owner, repo, token);
    s.stop('Downloaded theme files.');

    // Save token only after successful download
    if (isNewToken) {
      saveEnvValue('GITHUB_TOKEN', token);
      clack.log.success('Token saved to .env.local');
    }

    // 7. Read theme.json from downloaded theme
    const themeJsonPath = path.join(themeDir, 'theme.json');
    let themeConfig: ThemeJson | null = null;

    if (existsSync(themeJsonPath)) {
      themeConfig = JSON.parse(
        readFileSync(themeJsonPath, 'utf-8')
      ) as ThemeJson;
    }

    // 8. Clean and copy files
    s.start('Installing theme files...');
    cleanAuthDirs();
    const { appFiles, componentFiles, globalsReplaced, layoutReplaced } = installFromLocal(themeDir, themeConfig);
    s.stop('Theme files installed.');

    clack.log.success(`Replaced app/auth/ (${appFiles} files)`);
    clack.log.success(
      `Replaced components/auth/ (${componentFiles} files)`
    );
    if (globalsReplaced) {
      clack.log.success('Replaced globals.css with theme styles');
    }
    if (layoutReplaced) {
      clack.log.success('Replaced app/layout.tsx with theme layout');
    }

    // 9. Copy assets if any
    if (themeConfig?.assets && themeConfig.assets.length > 0) {
      const assetCount = installAssets(themeDir, themeConfig.assets);
      if (assetCount > 0) {
        clack.log.success(`Copied ${assetCount} asset(s) to public/`);
      }
    }

    // 10. Clear Next.js cache
    clearNextCache();
    clack.log.success('Cleared .next/ cache');

    // 11. Preview URL
    if (theme.preview) {
      clack.log.info(`Preview: ${theme.preview}`);
    }

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

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});