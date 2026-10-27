import { createHash } from 'node:crypto';
import type { TreeEntry } from './detect-skills';

export function filesFingerprint(files: TreeEntry[]): string {
  const content = [...files]
    .sort((a, b) => comparePaths(a.path, b.path))
    .map(({ path, sha }) => `${path}\0${sha}\n`)
    .join('');
  return createHash('sha256').update(content).digest('hex');
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
