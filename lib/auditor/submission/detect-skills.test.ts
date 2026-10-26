import { describe, expect, test } from 'bun:test';
import { detectSkills, type TreeEntry } from './detect-skills';

const blob = (path: string, sha = `sha-${path}`, size = 10): TreeEntry => ({
  path,
  type: 'blob',
  sha,
  size,
  mode: '100644',
});

const tree = (path: string): TreeEntry => ({
  path,
  type: 'tree',
  sha: `sha-${path}`,
  mode: '040000',
});

const manifest = { name: 'Example skill', description: 'A test skill' };

describe('detectSkills', () => {
  test('detects explain-changes at the repository root and excludes unrelated files', () => {
    const entries = [
      tree('skills'), tree('skills/explain-changes'),
      blob('skills/explain-changes/SKILL.md'), blob('skills/explain-changes/README.md'),
      blob('tests/example.test.ts'), blob('docs/guide.md'), blob('.github/workflows/ci.yml'),
    ];
    const result = detectSkills(entries, new Map([['skills/explain-changes/SKILL.md', manifest]]), '');

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.path).toBe('skills/explain-changes');
    expect(result.skills[0]?.files.map(({ path }) => path)).toEqual([
      'skills/explain-changes/README.md',
      'skills/explain-changes/SKILL.md',
    ]);
  });

  test('detects a skill when the submitted path is its folder', () => {
    const result = detectSkills([
      tree('skills/explain-changes'),
      blob('skills/explain-changes/SKILL.md'),
    ], new Map([['skills/explain-changes/SKILL.md', manifest]]), 'skills/explain-changes');

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills.map(({ path }) => path)).toEqual(['skills/explain-changes']);
  });

  test('detects security-audit from a repository root tree', () => {
    const entries = [
      tree('skills'), tree('skills/security-audit'),
      blob('skills/security-audit/SKILL.md'), blob('skills/security-audit/references/rules.md'),
      blob('tests/test_rules.py'), blob('docs/guide.md'), blob('.github/workflows/ci.yml'),
    ];
    const result = detectSkills(entries, new Map([
      ['skills/security-audit/SKILL.md', {
        name: 'Security Audit',
        description: 'Audit security findings',
      }],
    ]), '');

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills.map(({ path }) => path)).toEqual(['skills/security-audit']);
    expect(result.skills[0]?.files.map(({ path }) => path)).toEqual([
      'skills/security-audit/SKILL.md',
      'skills/security-audit/references/rules.md',
    ]);
  });

  test('rejects a folder without a valid skill manifest', () => {
    expect(detectSkills([tree('docs'), blob('docs/guide.md')], new Map(), 'docs')).toEqual({
      error: 'No hay ninguna skill en esta carpeta',
    });
  });

  test('keeps nested skill manifests inside the outer skill file set', () => {
    const result = detectSkills([
      tree('parent'), tree('parent/child'),
      blob('parent/SKILL.md'), blob('parent/child/SKILL.md'), blob('parent/child/example.ts'),
    ], new Map([
      ['parent/SKILL.md', manifest],
      ['parent/child/SKILL.md', { name: 'Nested', description: 'Nested skill' }],
    ]), '');

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills.map(({ path }) => path)).toEqual(['parent']);
    expect(result.skills[0]?.nestedSkillPaths).toEqual(['parent/child']);
    expect(result.skills[0]?.files.map(({ path }) => path)).toContain('parent/child/SKILL.md');
  });

  test('adds a plugin hook to each skill in its plugin', () => {
    const entries = [
      blob('plugins/tool/.claude-plugin/plugin.json'), blob('plugins/tool/hooks/hooks.json'),
      blob('plugins/tool/skills/one/SKILL.md'), blob('plugins/tool/skills/two/SKILL.md'),
    ];
    const result = detectSkills(entries, new Map([
      ['plugins/tool/skills/one/SKILL.md', manifest],
      ['plugins/tool/skills/two/SKILL.md', manifest],
    ]), '');

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills).toHaveLength(2);
    for (const skill of result.skills) {
      expect(skill.files.map(({ path }) => path)).toContain('plugins/tool/hooks/hooks.json');
    }
  });

  test('limits marketplace plugin extras to skills belonging to each plugin', () => {
    const entries = [
      blob('.claude-plugin/marketplace.json'),
      blob('plugins/alpha/.claude-plugin/plugin.json'), blob('plugins/alpha/hooks/hooks.json'),
      blob('plugins/alpha/skills/alpha/SKILL.md'),
      blob('plugins/beta/.claude-plugin/plugin.json'), blob('plugins/beta/commands/run.md'),
      blob('plugins/beta/skills/beta/SKILL.md'),
    ];
    const result = detectSkills(entries, new Map([
      ['plugins/alpha/skills/alpha/SKILL.md', manifest],
      ['plugins/beta/skills/beta/SKILL.md', manifest],
    ]), '');

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const alpha = result.skills.find(({ path }) => path.includes('/alpha/skills/'));
    const beta = result.skills.find(({ path }) => path.includes('/beta/skills/'));
    expect(alpha?.files.map(({ path }) => path)).toContain('plugins/alpha/hooks/hooks.json');
    expect(alpha?.files.map(({ path }) => path)).not.toContain('plugins/beta/commands/run.md');
    expect(beta?.files.map(({ path }) => path)).toContain('plugins/beta/commands/run.md');
    expect(beta?.files.map(({ path }) => path)).not.toContain('plugins/alpha/hooks/hooks.json');
  });
});
