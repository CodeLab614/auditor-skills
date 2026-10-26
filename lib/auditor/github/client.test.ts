import { describe, expect, test } from 'bun:test';
import { splitRefCandidates } from './client';

describe('splitRefCandidates', () => {
  test('tries the longest branch prefix before shorter prefixes', () => {
    expect(splitRefCandidates(['feat', 'login', 'skills', 'x'])).toEqual([
      { ref: 'feat/login/skills/x', path: '' },
      { ref: 'feat/login/skills', path: 'x' },
      { ref: 'feat/login', path: 'skills/x' },
      { ref: 'feat', path: 'login/skills/x' },
    ]);
  });

  test('treats a single segment as a ref at the repository root', () => {
    expect(splitRefCandidates(['main'])).toEqual([{ ref: 'main', path: '' }]);
  });
});
