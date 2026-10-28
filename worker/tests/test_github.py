"""Tests for GitHub commit tarball downloading, redirect policy, and size limits."""

import http.server
import threading
import time
from collections.abc import Callable, Generator

import pytest

from auditor_worker.errors import AnalysisFailure, TransientError
from auditor_worker.github import _is_allowed_redirect, download_tarball

type HandlerFn = Callable[[http.server.BaseHTTPRequestHandler], None]
type ServerFactory = Callable[[HandlerFn], http.server.ThreadingHTTPServer]


@pytest.fixture
def make_server() -> Generator[ServerFactory]:
    """Fixture providing temporary local HTTP servers on port 0 with automatic cleanup."""
    servers: list[tuple[http.server.ThreadingHTTPServer, threading.Thread]] = []

    def _create(handler_fn: Callable[[http.server.BaseHTTPRequestHandler], None]) -> http.server.ThreadingHTTPServer:
        class _Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, format: str, *args: object) -> None:
                pass  # Suppress stderr request logging during test runs

            def do_GET(self) -> None:
                handler_fn(self)

        srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()
        servers.append((srv, t))
        return srv

    yield _create

    for srv, t in servers:
        srv.shutdown()
        srv.server_close()
        t.join()


def test_authorization_sent_to_api_and_omitted_on_redirect(make_server: ServerFactory) -> None:
    """Authorization header is sent to api_base but stripped when following allowed redirect."""
    api_headers: dict[str, str] = {}
    redir_headers: dict[str, str] = {}

    def handle_redir(req: http.server.BaseHTTPRequestHandler) -> None:
        redir_headers.update(dict(req.headers))
        req.send_response(200)
        req.send_header("Content-Type", "application/x-gzip")
        req.end_headers()
        req.wfile.write(b"mock_archive_data")

    server2 = make_server(handle_redir)

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        api_headers.update(dict(req.headers))
        req.send_response(302)
        req.send_header("Location", f"http://127.0.0.1:{server2.server_port}/archive.tar.gz")
        req.end_headers()

    server1 = make_server(handle_api)

    stream = download_tarball(
        "test-owner",
        "test-repo",
        "deadbeef1234",
        token="ghp_super_secret_token",
        api_base=f"http://127.0.0.1:{server1.server_port}",
        redirect_hosts=("127.0.0.1",),
    )

    data = stream.read()
    stream.close()

    assert data == b"mock_archive_data"
    assert api_headers.get("Authorization") == "Bearer ghp_super_secret_token"
    assert "Authorization" not in redir_headers
    assert redir_headers.get("User-Agent") == "auditor-skills-worker"


def test_redirect_to_disallowed_host_is_rejected(make_server: ServerFactory) -> None:
    """Redirecting to a host not in redirect_hosts is immediately rejected with AnalysisFailure."""

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        req.send_response(302)
        req.send_header("Location", "http://evil.example.com/untrusted.tar.gz")
        req.end_headers()

    server = make_server(handle_api)

    with pytest.raises(AnalysisFailure) as exc_info:
        download_tarball(
            "test-owner",
            "test-repo",
            "deadbeef1234",
            token="ghp_test_token",
            api_base=f"http://127.0.0.1:{server.server_port}",
            redirect_hosts=("codeload.github.com",),
        )

    assert "No se pudo descargar el commit de GitHub" in str(exc_info.value)


def test_redirect_scheme_downgrade_rejected() -> None:
    """Redirecting to an insecure scheme or disallowed host is rejected by _is_allowed_redirect."""
    assert not _is_allowed_redirect(
        "https",
        "http://codeload.github.com/owner/repo/tarball/sha",
        ("codeload.github.com",),
    )
    assert _is_allowed_redirect(
        "https",
        "https://codeload.github.com/owner/repo/tarball/sha",
        ("codeload.github.com",),
    )
    assert _is_allowed_redirect(
        "https",
        "https://CODELOAD.GITHUB.COM/owner/repo/tarball/sha",
        ("codeload.github.com",),
    )
    assert not _is_allowed_redirect(
        "http",
        "https://codeload.github.com/owner/repo/tarball/sha",
        ("codeload.github.com",),
    )
    assert not _is_allowed_redirect(
        "https",
        "https://evil.example.com/owner/repo/tarball/sha",
        ("codeload.github.com",),
    )


def test_404_raises_analysis_failure(make_server: ServerFactory) -> None:
    """HTTP 404 response raises AnalysisFailure indicating repo or commit no longer exists."""

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        req.send_response(404)
        req.end_headers()

    server = make_server(handle_api)

    with pytest.raises(AnalysisFailure) as exc_info:
        download_tarball(
            "test-owner",
            "test-repo",
            "deadbeef1234",
            token=None,
            api_base=f"http://127.0.0.1:{server.server_port}",
        )

    assert "El repositorio o el commit ya no existen en GitHub" in str(exc_info.value)


def test_403_raises_transient_error(make_server: ServerFactory) -> None:
    """HTTP 403 response (rate limit or forbidden) raises TransientError."""

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        req.send_response(403)
        req.end_headers()

    server = make_server(handle_api)

    with pytest.raises(TransientError):
        download_tarball(
            "test-owner",
            "test-repo",
            "deadbeef1234",
            token=None,
            api_base=f"http://127.0.0.1:{server.server_port}",
        )


def test_503_raises_transient_error(make_server: ServerFactory) -> None:
    """HTTP 5xx server error response raises TransientError."""

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        req.send_response(503)
        req.end_headers()

    server = make_server(handle_api)

    with pytest.raises(TransientError):
        download_tarball(
            "test-owner",
            "test-repo",
            "deadbeef1234",
            token=None,
            api_base=f"http://127.0.0.1:{server.server_port}",
        )


def test_max_bytes_limit_enforced(make_server: ServerFactory) -> None:
    """Streaming reader raises AnalysisFailure as soon as read data exceeds max_bytes."""

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        req.send_response(200)
        req.end_headers()
        req.wfile.write(b"x" * 500)

    server = make_server(handle_api)

    stream = download_tarball(
        "test-owner",
        "test-repo",
        "deadbeef1234",
        token=None,
        api_base=f"http://127.0.0.1:{server.server_port}",
        max_bytes=100,
    )

    with pytest.raises(AnalysisFailure) as exc_info:
        stream.read()

    assert "El repositorio es demasiado grande para analizarlo" in str(exc_info.value)


def test_connection_drop_mid_download_is_transient(make_server: ServerFactory) -> None:
    """Server dropping connection mid-download raises TransientError on stream.read()."""

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        req.send_response(200)
        req.send_header("Content-Length", "100000")
        req.end_headers()
        req.wfile.write(b"partial_data")
        req.wfile.flush()
        req.close_connection = True

    server = make_server(handle_api)

    stream = download_tarball(
        "test-owner",
        "test-repo",
        "deadbeef1234",
        token=None,
        api_base=f"http://127.0.0.1:{server.server_port}",
    )

    with pytest.raises(TransientError) as exc_info:
        stream.read()

    assert "Se cortó la descarga del commit de GitHub" in str(exc_info.value)


def test_no_token_omits_authorization(make_server: ServerFactory) -> None:
    """When token is None, no Authorization header is transmitted."""
    received_headers: dict[str, str] = {}

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        received_headers.update(dict(req.headers))
        req.send_response(200)
        req.end_headers()
        req.wfile.write(b"ok")

    server = make_server(handle_api)

    stream = download_tarball(
        "test-owner",
        "test-repo",
        "deadbeef1234",
        token=None,
        api_base=f"http://127.0.0.1:{server.server_port}",
    )
    content = stream.read()
    stream.close()

    assert content == b"ok"
    assert "Authorization" not in received_headers


def test_timeout_raises_transient_error(make_server: ServerFactory) -> None:
    """Network timeouts raise TransientError."""

    def handle_api(req: http.server.BaseHTTPRequestHandler) -> None:
        time.sleep(0.2)
        req.send_response(200)
        req.end_headers()

    server = make_server(handle_api)

    with pytest.raises(TransientError):
        download_tarball(
            "test-owner",
            "test-repo",
            "deadbeef1234",
            token=None,
            api_base=f"http://127.0.0.1:{server.server_port}",
            timeout=0.05,
        )
