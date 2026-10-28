"""GitHub commit tarball downloader with security constraints."""

import contextlib
import http.client
import io
import urllib.parse
from typing import BinaryIO

from auditor_worker.errors import AnalysisFailure, TransientError
from auditor_worker.limits import MAX_TARBALL_BYTES


class _DownloadStream(io.RawIOBase, BinaryIO):
    """Streaming response reader that enforces max_bytes downloaded without disk storage."""

    def __init__(
        self,
        response: http.client.HTTPResponse,
        conn: http.client.HTTPConnection,
        max_bytes: int,
    ) -> None:
        self._response = response
        self._conn = conn
        self._max_bytes = max_bytes
        self._bytes_read = 0
        self._closed = False

    def readable(self) -> bool:
        return True

    def read(self, size: int = -1) -> bytes:
        if self._closed:
            raise ValueError("I/O operation on closed file.")
        read_size = None if size is None or size < 0 else size
        try:
            chunk = self._response.read(read_size)
        except (TimeoutError, OSError, http.client.HTTPException) as err:
            self.close()
            raise TransientError("Se cortó la descarga del commit de GitHub") from err
        if not chunk:
            return b""
        self._bytes_read += len(chunk)
        if self._bytes_read > self._max_bytes:
            self.close()
            raise AnalysisFailure("El repositorio es demasiado grande para analizarlo")
        return chunk

    def readinto(self, b: bytearray | memoryview) -> int:
        data = self.read(len(b))
        n = len(data)
        b[:n] = data
        return n

    def close(self) -> None:
        if not self._closed:
            self._closed = True
            try:
                self._response.close()
            finally:
                self._conn.close()

    def __enter__(self) -> _DownloadStream:
        return self

    def __exit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        self.close()


def _is_allowed_redirect(
    api_scheme: str,
    redirect_url: str,
    redirect_hosts: tuple[str, ...] | list[str] | set[str],
) -> bool:
    """Validate that redirect URL matches the API scheme and an allowed host."""
    parsed = urllib.parse.urlsplit(redirect_url)
    if (parsed.scheme or "").lower() != api_scheme.lower():
        return False
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False
    return any(hostname == host.lower() for host in redirect_hosts)


def download_tarball(
    owner: str,
    repo: str,
    commit_sha: str,
    token: str | None,
    *,
    api_base: str = "https://api.github.com",
    redirect_hosts: tuple[str, ...] = ("codeload.github.com",),
    max_bytes: int = MAX_TARBALL_BYTES,
    timeout: float = 30.0,
) -> BinaryIO:
    """Download a commit tarball from GitHub with strict security controls.

    - Follows at most one redirection, strictly to an allowed redirect host.
    - Sends Authorization header only to api_base; strips Authorization on redirection.
    - Returns an in-memory streaming reader that raises AnalysisFailure if max_bytes is exceeded.
    - Translates 404 to AnalysisFailure and 403, 429, 5xx, or network timeouts to TransientError.
    """
    safe_owner = urllib.parse.quote(owner, safe="")
    safe_repo = urllib.parse.quote(repo, safe="")
    safe_commit = urllib.parse.quote(commit_sha, safe="")
    initial_url = f"{api_base.rstrip('/')}/repos/{safe_owner}/{safe_repo}/tarball/{safe_commit}"
    parsed_api = urllib.parse.urlsplit(initial_url)

    api_headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "auditor-skills-worker",
    }
    if token and token.strip():
        api_headers["Authorization"] = f"Bearer {token.strip()}"

    def _open_conn(parsed: urllib.parse.SplitResult) -> http.client.HTTPConnection:
        if parsed.scheme == "https":
            return http.client.HTTPSConnection(parsed.hostname or "", parsed.port or 443, timeout=timeout)
        if parsed.scheme == "http":
            return http.client.HTTPConnection(parsed.hostname or "", parsed.port or 80, timeout=timeout)
        raise AnalysisFailure("No se pudo descargar el commit de GitHub")

    conn: http.client.HTTPConnection | None = None
    redir_conn: http.client.HTTPConnection | None = None
    success = False

    try:
        conn = _open_conn(parsed_api)
        path = parsed_api.path or "/"
        if parsed_api.query:
            path = f"{path}?{parsed_api.query}"

        conn.request("GET", path, headers=api_headers)
        resp = conn.getresponse()

        if resp.status in (301, 302, 303, 307, 308):
            location = resp.headers.get("Location")
            if not location:
                raise AnalysisFailure("No se pudo descargar el commit de GitHub")

            redirect_url = urllib.parse.urljoin(initial_url, location)
            if not _is_allowed_redirect(parsed_api.scheme, redirect_url, redirect_hosts):
                raise AnalysisFailure("No se pudo descargar el commit de GitHub")

            conn.close()
            conn = None

            parsed_redir = urllib.parse.urlsplit(redirect_url)
            redir_conn = _open_conn(parsed_redir)
            redir_path = parsed_redir.path or "/"
            if parsed_redir.query:
                redir_path = f"{redir_path}?{parsed_redir.query}"

            redir_headers = {
                "Accept": "application/vnd.github+json",
                "User-Agent": "auditor-skills-worker",
            }
            redir_conn.request("GET", redir_path, headers=redir_headers)
            final_resp = redir_conn.getresponse()
            active_conn = redir_conn
        else:
            final_resp = resp
            active_conn = conn

        if 200 <= final_resp.status < 300:
            success = True
            return _DownloadStream(final_resp, active_conn, max_bytes=max_bytes)

        if final_resp.status == 404:
            raise AnalysisFailure("El repositorio o el commit ya no existen en GitHub")

        if final_resp.status in (403, 429):
            raise TransientError(f"Límite de peticiones o acceso denegado en GitHub (HTTP {final_resp.status})")

        if final_resp.status >= 500:
            raise TransientError(f"Error temporal del servidor de GitHub (HTTP {final_resp.status})")

        raise AnalysisFailure("No se pudo descargar el commit de GitHub")

    except AnalysisFailure, TransientError:
        raise
    except TimeoutError as err:
        raise TransientError("Tiempo de espera agotado al conectar con GitHub") from err
    except (ConnectionError, http.client.HTTPException, OSError) as err:
        raise TransientError("Error de conexión al descargar el commit de GitHub") from err
    finally:
        if not success:
            if conn is not None:
                with contextlib.suppress(OSError):
                    conn.close()
            if redir_conn is not None:
                with contextlib.suppress(OSError):
                    redir_conn.close()


__all__ = ["download_tarball"]
