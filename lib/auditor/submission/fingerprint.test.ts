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

  test('matches shared vector with Python worker', () => {
    const vectorFiles: TreeEntry[] = [
      { path: 'scripts/run.py', type: 'blob', sha: 'b'.repeat(40), mode: '100644' },
      { path: 'SKILL.md', type: 'blob', sha: 'a'.repeat(40), mode: '100644' },
    ];
    expect(filesFingerprint(vectorFiles)).toBe(
      '9cd639c3800300de6aedea0aa5217934519fa8b4338f7c2ebccf240470929b73',
    );
  });

  test('orders non-ASCII paths matching UTF-16 code units', () => {
    const nonAsciiFiles: TreeEntry[] = [
      { path: 'a\u{1F600}', type: 'blob', sha: 'd'.repeat(40), mode: '100644' },
      { path: 'a' + String.fromCharCode(0xffff), type: 'blob', sha: 'c'.repeat(40), mode: '100644' },
    ];
    expect(filesFingerprint(nonAsciiFiles)).toBe(
      '3742bf599de33d798a567e1cb681fe5e7e87cc8af49e7af8ea8a688d8f976f5f',
    );
  });
});
