import type { TreeEntry } from '../submission/detect-skills';

const API_ROOT = 'https://api.github.com';
const TIMEOUT_MS = 10_000;

export type GithubErrorCode =
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TREE_TOO_LARGE'
  | 'REF_NOT_FOUND'
  | 'REQUEST_FAILED'
  | 'REQUEST_TIMEOUT';

export class GithubClientError extends Error {
  constructor(message: string, readonly code: GithubErrorCode, readonly status?: number) {
    super(message);
    this.name = 'GithubClientError';
  }
}

export type GithubRepository = {
  default_branch: string;
  full_name: string;
  name: string;
  owner: { login: string };
};

export type ResolvedGithubPath = {
  commitSha: string;
  ref: string;
  path: string;
  fullName: string;
};

export function splitRefCandidates(segments: string[]): Array<{ ref: string; path: string }> {
  const candidates: Array<{ ref: string; path: string }> = [];
  for (let refLength = segments.length; refLength >= 1; refLength -= 1) {
    candidates.push({
      ref: segments.slice(0, refLength).join('/'),
      path: segments.slice(refLength).join('/'),
    });
  }
  return candidates;
}

export function createGithubClient(token?: string) {
  async function request<T>(path: string): Promise<T> {
    const headers = new Headers({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetch(`${API_ROOT}${path}`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GithubClientError('GitHub no responde ahora mismo; inténtalo en unos minutos',
          'REQUEST_TIMEOUT');
      }
      throw new GithubClientError('No se pudo consultar GitHub', 'REQUEST_FAILED');
    }

    if (response.status === 404) {
      throw new GithubClientError('El repositorio no existe o es privado', 'NOT_FOUND', 404);
    }
    if ((response.status === 403 || response.status === 429)
      && response.headers.get('x-ratelimit-remaining') === '0') {
      throw new GithubClientError('GitHub no responde ahora mismo; inténtalo en unos minutos',
        'RATE_LIMITED', response.status);
    }
    if (!response.ok) {
      throw new GithubClientError('No se pudo consultar GitHub', 'REQUEST_FAILED', response.status);
    }
    return await response.json() as T;
  }

  return {
    async getRepo(owner: string, repo: string): Promise<GithubRepository> {
      return request<GithubRepository>(`/repos/${encode(owner)}/${encode(repo)}`);
    },

    async resolveRefAndPath(owner: string, repo: string, segments: string[]): Promise<ResolvedGithubPath> {
      const repository = await this.getRepo(owner, repo);
      if (segments.length === 0) {
        const commit = await request<{ sha: string }>(
          `/repos/${encode(owner)}/${encode(repo)}/commits/${encode(repository.default_branch)}`,
        );
        return {
          commitSha: commit.sha,
          ref: repository.default_branch,
          path: '',
          fullName: repository.full_name,
        };
      }

      for (const candidate of splitRefCandidates(segments)) {
        try {
          const commit = await request<{ sha: string }>(
            `/repos/${encode(owner)}/${encode(repo)}/commits/${encode(candidate.ref)}`,
          );
          return {
            commitSha: commit.sha,
            ref: candidate.ref,
            path: candidate.path,
            fullName: repository.full_name,
          };
        } catch (error) {
          // GitHub answers 422, not 404, when the ref does not exist; both mean "try a shorter prefix".
          const missingRef = error instanceof GithubClientError
            && (error.code === 'NOT_FOUND' || error.status === 422);
          if (!missingRef) throw error;
        }
      }
      throw new GithubClientError('No se encontró esa rama, etiqueta o commit en GitHub', 'REF_NOT_FOUND', 404);
    },

    async getTree(owner: string, repo: string, commitSha: string): Promise<TreeEntry[]> {
      const response = await request<{ truncated: boolean; tree: TreeEntry[] }>(
        `/repos/${encode(owner)}/${encode(repo)}/git/trees/${encode(commitSha)}?recursive=1`,
      );
      if (response.truncated) {
        throw new GithubClientError('El repositorio es demasiado grande para analizarlo', 'TREE_TOO_LARGE');
      }
      return response.tree;
    },

    async getBlobText(owner: string, repo: string, sha: string): Promise<string> {
      const response = await request<{ content: string; encoding: string }>(
        `/repos/${encode(owner)}/${encode(repo)}/git/blobs/${encode(sha)}`,
      );
      if (response.encoding !== 'base64') {
        throw new GithubClientError('GitHub devolvió un archivo con formato desconocido', 'REQUEST_FAILED');
      }
      return Buffer.from(response.content.replace(/\n/g, ''), 'base64').toString('utf8');
    },
  };
}

function encode(value: string): string {
  return encodeURIComponent(value);
}
