import { describe, expect, test } from 'bun:test';
import type { TreeEntry } from './detect-skills';
import {
  generateSkillSlug,
  getManifestPathsToRead,
  getSkillLimitReason,
  needsSourceFiles,
  validateSelectedSkillPaths,
} from './submission-rules';

const file = (path: string, size = 1): TreeEntry => ({
  path,
  type: 'blob',
  sha: path,
  size,
  mode: '100644',
});

describe('getManifestPathsToRead', () => {
  test('includes manifests in the submitted folder and each ancestor', () => {
    const tree = [
      file('SKILL.md'),
      file('packages/SKILL.md'),
      file('packages/plugin/SKILL.md'),
      file('packages/plugin/child/SKILL.md'),
      file('packages/other/SKILL.md'),
      file('elsewhere/SKILL.md'),
      file('packages/plugin/readme.md'),
    ];

    expect(getManifestPathsToRead(tree, 'packages/plugin')).toEqual([
      'SKILL.md',
      'packages/SKILL.md',
      'packages/plugin/SKILL.md',
      'packages/plugin/child/SKILL.md',
    ]);
  });

  test('reports when more than fifty manifests are relevant', () => {
    const tree = Array.from({ length: 51 }, (_, index) =>
      file(`skills/skill-${index}/SKILL.md`),
    );

    expect(getManifestPathsToRead(tree, 'skills')).toEqual({
      error: 'Esta ruta tiene demasiadas skills; envía una carpeta más concreta',
    });
  });
});

describe('getSkillLimitReason', () => {
  test('reports file-count, total-size, then per-file limits', () => {
    expect(getSkillLimitReason({ files: [file('a'), file('b')] }, {
      maxFiles: 1,
      maxTotalBytes: 10,
      maxFileBytes: 10,
    })).toBe('Supera el límite de 1 archivo');

    expect(getSkillLimitReason({ files: [file('a', 11)] }, {
      maxFiles: 2,
      maxTotalBytes: 10,
      maxFileBytes: 20,
    })).toBe('Supera el límite de 10 bytes en total');

    expect(getSkillLimitReason({ files: [file('a', 11)] }, {
      maxFiles: 2,
      maxTotalBytes: 20,
      maxFileBytes: 10,
    })).toBe('Supera el límite de 10 bytes por archivo');
  });
});

describe('generateSkillSlug', () => {
  test('builds a lowercase slug from owner, repository, and skill folder', () => {
    expect(generateSkillSlug('CloudFlare', 'Security_Audit', 'skills/security-audit'))
      .toBe('cloudflare-security-audit-security-audit');
  });

  test('uses the next numeric suffix when the base slug is taken', () => {
    expect(generateSkillSlug('owner', 'repo', 'skills/My Skill', new Set([
      'owner-repo-my-skill',
      'owner-repo-my-skill-2',
    ]))).toBe('owner-repo-my-skill-3');
  });
});

describe('validateSelectedSkillPaths', () => {
  const skills = [
    { path: 'skills/new', state: 'new' },
    { path: 'skills/done', state: 'analyzed' },
    { path: 'skills/working', state: 'in-progress' },
    { path: 'skills/retired', state: 'retired' },
    { path: 'skills/too-large', state: 'rejected', reason: 'too large' },
  ] as const;

  test('accepts detected, eligible, unique, non-empty paths', () => {
    expect(validateSelectedSkillPaths(['skills/new', 'skills/done'], skills)).toEqual({
      ok: true,
      skills: [skills[0], skills[1]],
    });
  });

  test('rejects empty, duplicate, unknown, retired, and rejected paths', () => {
    expect(validateSelectedSkillPaths([], skills)).toMatchObject({ ok: false });
    expect(validateSelectedSkillPaths(['skills/new', 'skills/new'], skills)).toMatchObject({
      ok: false,
    });
    expect(validateSelectedSkillPaths(['skills/missing'], skills)).toMatchObject({ ok: false });
    expect(validateSelectedSkillPaths(['skills/retired'], skills)).toMatchObject({ ok: false });
    expect(validateSelectedSkillPaths(['skills/too-large'], skills)).toMatchObject({ ok: false });
  });
});

describe('needsSourceFiles', () => {
  test('returns true for empty arrays, null, undefined, or non-arrays', () => {
    expect(needsSourceFiles([])).toBe(true);
    expect(needsSourceFiles(null)).toBe(true);
    expect(needsSourceFiles(undefined)).toBe(true);
    expect(needsSourceFiles('x')).toBe(true);
    expect(needsSourceFiles([{ path: 'a' }])).toBe(false);
  });
});
