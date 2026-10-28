import { describe, expect, test } from 'bun:test';
import { createGithubClient, splitRefCandidates } from './client';

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

describe('resolveRefAndPath', () => {
  test('returns fullName with default branch when segments are empty', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/commits/main')) {
        return new Response(JSON.stringify({ sha: 'commit-sha-root' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/repos/CodeLab614/Skills')) {
        return new Response(JSON.stringify({
          default_branch: 'main',
          full_name: 'CodeLab614/Skills',
          name: 'Skills',
          owner: { login: 'CodeLab614' },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    try {
      const client = createGithubClient();
      const resolved = await client.resolveRefAndPath('CodeLab614', 'Skills', []);
      expect(resolved).toEqual({
        commitSha: 'commit-sha-root',
        ref: 'main',
        path: '',
        fullName: 'CodeLab614/Skills',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('returns fullName when resolving ref candidate and path', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/commits/feat%2Ftest')) {
        return new Response(JSON.stringify({ sha: 'commit-sha-branch' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/repos/Owner/Repo')) {
        return new Response(JSON.stringify({
          default_branch: 'main',
          full_name: 'Owner/Repo',
          name: 'Repo',
          owner: { login: 'Owner' },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    try {
      const client = createGithubClient();
      const resolved = await client.resolveRefAndPath('Owner', 'Repo', ['feat', 'test', 'sub', 'skill']);
      expect(resolved).toEqual({
        commitSha: 'commit-sha-branch',
        ref: 'feat/test',
        path: 'sub/skill',
        fullName: 'Owner/Repo',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
