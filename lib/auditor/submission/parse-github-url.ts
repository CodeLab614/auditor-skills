export type ParsedGithubUrl =
  | { ok: true; owner: string; repo: string; refAndPath: string[] | null }
  | { ok: false; reason: string };

// GitHub owners are letters, digits and hyphens; repository names also allow dots and underscores.
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export function parseGithubUrl(input: string): ParsedGithubUrl {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'La ruta de GitHub no es válida' };
  }

  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password) {
    return { ok: false, reason: 'Usa una ruta completa de un repositorio público de GitHub' };
  }
  if (url.search || url.hash) {
    return { ok: false, reason: 'La ruta no puede incluir parámetros ni fragmentos' };
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && (!OWNER_PATTERN.test(segments[0]!) || !REPO_PATTERN.test(segments[1]!))) {
    return { ok: false, reason: 'El dueño o el repositorio de la ruta no son válidos' };
  }
  if (segments.length === 2) {
    return { ok: true, owner: segments[0]!, repo: segments[1]!, refAndPath: null };
  }
  if (segments.length >= 4 && segments[2] === 'tree') {
    return {
      ok: true,
      owner: segments[0]!,
      repo: segments[1]!,
      refAndPath: segments.slice(3),
    };
  }
  return { ok: false, reason: 'Usa la ruta del repositorio o una carpeta dentro de tree' };
}
