#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLASSIC = path.join(ROOT, 'themes', 'classic');
const CONFIG_PATH = path.join(CLASSIC, 'theme.json');

type ThemeConfig = {
  coreVersion?: string;
  scopes?: {
    auth?: { pages: string; components: string };
    dashboard?: unknown;
    landing?: { page: string; components?: string };
    styles?: { globals: string };
    layout?: { root: string };
    ui?: { components: string };
  };
};

type Route = { source: string; target: string };

function assertInsideRoot(relative: string): string {
  if (path.isAbsolute(relative) || path.win32.isAbsolute(relative) || relative.includes('\0')) {
    throw new Error(`Classic theme path must be relative: ${relative}`);
  }
  const resolved = path.resolve(ROOT, relative);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`Classic theme path escapes the project: ${relative}`);
  }
  return resolved;
}

function getRoutes(config: ThemeConfig): Route[] {
  const scopes = config.scopes ?? {};
  if (scopes.dashboard) throw new Error('Classic theme must not declare the dashboard scope.');
  const routes: Route[] = [];
  if (scopes.auth) {
    routes.push({ source: scopes.auth.pages, target: scopes.auth.pages });
    routes.push({ source: scopes.auth.components, target: scopes.auth.components });
  }
  if (scopes.landing) {
    routes.push({ source: scopes.landing.page, target: scopes.landing.page });
    if (scopes.landing.components) routes.push({ source: scopes.landing.components, target: scopes.landing.components });
  }
  if (scopes.styles) routes.push({ source: scopes.styles.globals, target: scopes.styles.globals });
  if (scopes.layout) routes.push({ source: scopes.layout.root, target: scopes.layout.root });
  if (scopes.ui) routes.push({ source: scopes.ui.components, target: scopes.ui.components });
  return routes;
}

function filesAt(target: string): Map<string, string> {
  const files = new Map<string, string>();
  if (!existsSync(target)) return files;
  const stat = lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error(`Symbolic links are not allowed in Classic routes: ${target}`);
  if (stat.isFile()) {
    files.set('.', readFileSync(target).toString('base64'));
  } else if (stat.isDirectory()) {
    for (const entry of readdirSync(target).sort()) {
      for (const [name, content] of filesAt(path.join(target, entry))) {
        files.set(path.join(entry, name), content);
      }
    }
  } else {
    throw new Error(`Unsupported Classic route: ${target}`);
  }
  return files;
}

function differences(source: string, target: string, label: string): string[] {
  const sourceFiles = filesAt(source);
  const targetFiles = filesAt(target);
  const result: string[] = [];
  const names = new Set([...sourceFiles.keys(), ...targetFiles.keys()]);
  for (const name of [...names].sort()) {
    if (sourceFiles.get(name) !== targetFiles.get(name)) {
      result.push(name === '.' ? label : path.posix.join(label, name.split(path.sep).join('/')));
    }
  }
  return result;
}

function main(): void {
  const args = process.argv.slice(2);
  const checkOnly = args.length === 1 && args[0] === '--check';
  if (args.length > 0 && !checkOnly) {
    throw new Error('Usage: bun run theme:sync-classic [--check]');
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as ThemeConfig;
  const routes = getRoutes(config);
  const changed: string[] = [];

  for (const route of routes) {
    const source = assertInsideRoot(route.source);
    const target = assertInsideRoot(path.posix.join('themes/classic', route.target));
    if (!existsSync(source)) throw new Error(`Current theme source does not exist: ${route.source}`);
    if (checkOnly) {
      changed.push(...differences(source, target, route.target));
      continue;
    }
    rmSync(target, { recursive: true, force: true });
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true, dereference: false });
    console.log(`Synced ${route.source} → themes/classic/${route.target}`);
  }

  if (checkOnly && changed.length) {
    console.error('Classic theme differs from the current template:');
    for (const file of changed) console.error(`  ${file}`);
    process.exitCode = 1;
  } else if (checkOnly) {
    console.log('Classic theme matches the current template.');
  }
}

main();
