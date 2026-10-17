import { existsSync, lstatSync, readdirSync, readlinkSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

export const THEME_TARGETS = [
  'app/auth',
  'components/auth',
  'app/page.tsx',
  'components/landing-content.tsx',
  'app/globals.css',
  'app/layout.tsx',
  'components/ui',
] as const;

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const CLASSIC_DIR = path.join(ROOT_DIR, 'themes', 'classic');

function snapshot(target: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!existsSync(target)) return result;
  const stat = lstatSync(target);
  if (stat.isSymbolicLink()) {
    result.set('.', `link:${readlinkSync(target)}`);
  } else if (stat.isFile()) {
    result.set('.', readFileSync(target).toString('base64'));
  } else if (stat.isDirectory()) {
    for (const name of readdirSync(target).sort()) {
      const nested = snapshot(path.join(target, name));
      for (const [key, value] of nested) result.set(path.join(name, key), value);
    }
  }
  return result;
}

export function getThemeChangedPaths(targets: readonly string[] = THEME_TARGETS): string[] {
  const changed = new Set<string>();
  try {
    const status = execFileSync('git', ['status', '--porcelain', '--', ...targets], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    for (const line of status.split('\n').filter(Boolean)) {
      const filePath = line.slice(3).split(' -> ').at(-1);
      if (filePath) changed.add(filePath.replace(/^"|"$/g, ''));
    }
  } catch {
    // A project without Git can still be checked against its Classic files.
  }

  for (const relative of targets) {
    const current = snapshot(path.join(ROOT_DIR, relative));
    const classic = snapshot(path.join(CLASSIC_DIR, relative));
    if (current.size !== classic.size || [...current].some(([key, value]) => classic.get(key) !== value)) {
      changed.add(relative);
    }
  }
  return [...changed].sort();
}
