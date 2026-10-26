import { describe, expect, test } from 'bun:test';
import { parseGithubUrl } from './parse-github-url';

describe('parseGithubUrl', () => {
  test('parses a repository root with or without a trailing slash', () => {
    expect(parseGithubUrl('https://github.com/CodeLab614-AI/skills')).toEqual({
      ok: true,
      owner: 'CodeLab614-AI',
      repo: 'skills',
      refAndPath: null,
    });
    expect(parseGithubUrl('https://github.com/cloudflare/security-audit-skill/')).toEqual({
      ok: true,
      owner: 'cloudflare',
      repo: 'security-audit-skill',
      refAndPath: null,
    });
  });

  test('parses a tree URL and keeps slash-separated ref candidates', () => {
    expect(parseGithubUrl('https://github.com/org/repo/tree/feat/login/skills/x')).toEqual({
      ok: true,
      owner: 'org',
      repo: 'repo',
      refAndPath: ['feat', 'login', 'skills', 'x'],
    });
  });

  test('parses the repository root at a ref', () => {
    expect(parseGithubUrl('https://github.com/org/repo/tree/main')).toEqual({
      ok: true,
      owner: 'org',
      repo: 'repo',
      refAndPath: ['main'],
    });
  });

  test.each([
    ['http://github.com/org/repo'],
    ['https://gitlab.com/org/repo'],
    ['https://github.com/org/repo/blob/main/skill'],
    ['https://github.com/org/repo?tab=readme'],
    ['https://github.com/org/repo#readme'],
    ['https://github.com/org'],
    ['https://github.com/org/repo/tree'],
    ['https://github.com/org%2Fx/repo'],
    ['https://github.com/org/re%20po'],
  ] as const)('rejects unsupported URL %s', (url: string) => {
    expect(parseGithubUrl(url).ok).toBe(false);
  });
});
