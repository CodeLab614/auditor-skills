import { describe, expect, test } from 'bun:test';
import { filesFingerprint } from './fingerprint';
import type { TreeEntry } from './detect-skills';

const files: TreeEntry[] = [
  { path: 'b.txt', type: 'blob', sha: 'bbb', mode: '100644' },
  { path: 'a.txt', type: 'blob', sha: 'aaa', mode: '100644' },
];

describe('filesFingerprint', () => {
  test('returns the same digest regardless of input order', () => {
    expect(filesFingerprint(files)).toBe(filesFingerprint([...files].reverse()));
  });

  test('changes when a blob SHA changes', () => {
    const changed = files.map((file) => file.path === 'a.txt' ? { ...file, sha: 'changed' } : file);
    expect(filesFingerprint(files)).not.toBe(filesFingerprint(changed));
  });
});
