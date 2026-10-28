"""Tests for public remote script fetching, SSRF protections, and limits."""

import io
import socket
from typing import Any

import pytest

from auditor_worker.fetch import fetch_public


def _make_resolver(ips: list[str]) -> Any:
    def resolver(host: str, port: int, type: int = socket.SOCK_STREAM) -> list[Any]:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port)) for ip in ips]

    return resolver


def test_fetch_blocks_private() -> None:
    public_resolver = _make_resolver(["93.184.216.34"])

    # 1. 127.0.0.1 loopback
    res = fetch_public("https://127.0.0.1/", resolver=_make_resolver(["127.0.0.1"]))
    assert res.status == "blocked"

    # 2. 169.254.169.254 link-local (cloud metadata)
    res = fetch_public("https://169.254.169.254/", resolver=_make_resolver(["169.254.169.254"]))
    assert res.status == "blocked"

    # 3. Non-https scheme
    res = fetch_public("http://example.com/", resolver=public_resolver)
    assert res.status == "blocked"

    # 4. Hostname resolving to private 10.0.0.5
    res = fetch_public("https://internal.corp/", resolver=_make_resolver(["10.0.0.5"]))
    assert res.status == "blocked"

    # 5. Mixed public and private IP resolution
    res = fetch_public(
        "https://mixed.example.com/",
        resolver=_make_resolver(["93.184.216.34", "10.0.0.1"]),
    )
    assert res.status == "blocked"

    # 6. IPv4-mapped IPv6 address [::ffff:127.0.0.1]
    res = fetch_public("https://[::ffff:127.0.0.1]/", resolver=_make_resolver(["::ffff:127.0.0.1"]))
    assert res.status == "blocked"

    # 7. Credentials in URL
    res = fetch_public("https://user:pw@example.com/", resolver=public_resolver)
    assert res.status == "blocked"


def test_fetch_ok_returns_data_and_final_url() -> None:
    public_resolver = _make_resolver(["93.184.216.34"])

    def mock_connector(host: str, ip: str, port: int, path: str, timeout: float) -> tuple[int, dict[str, str], Any]:
        assert host == "example.com"
        assert ip == "93.184.216.34"
        assert port == 443
        assert path == "/install.sh?token=abc"
        return 200, {}, io.BytesIO(b"echo 'ready'")

    res = fetch_public(
        "https://example.com/install.sh?token=abc",
        resolver=public_resolver,
        connector=mock_connector,
    )
    assert res.status == "ok"
    assert res.data == b"echo 'ready'"
    assert res.final_url == "https://example.com/install.sh?token=abc"
    assert res.reason is None


def test_fetch_redirect_to_localhost_blocked() -> None:
    def redirect_connector(host: str, ip: str, port: int, path: str, timeout: float) -> tuple[int, dict[str, str], Any]:
        return 302, {"Location": "https://127.0.0.1/exploit.sh"}, io.BytesIO(b"")

    def mixed_resolver(host: str, port: int, type: int = socket.SOCK_STREAM) -> list[Any]:
        if host == "127.0.0.1":
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port))]
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]

    res = fetch_public(
        "https://example.com/start.sh",
        resolver=mixed_resolver,
        connector=redirect_connector,
    )
    assert res.status == "blocked"
    assert res.final_url == "https://127.0.0.1/exploit.sh"


def test_fetch_too_many_redirects() -> None:
    public_resolver = _make_resolver(["93.184.216.34"])

    def redirect_loop_connector(
        host: str, ip: str, port: int, path: str, timeout: float
    ) -> tuple[int, dict[str, str], Any]:
        return 301, {"Location": f"{path}_next"}, io.BytesIO(b"")

    res = fetch_public(
        "https://example.com/start",
        resolver=public_resolver,
        connector=redirect_loop_connector,
        max_redirects=3,
    )
    assert res.status == "failed"
    assert res.reason == "Se superó el número máximo de redirecciones"


def test_fetch_size_cap() -> None:
    public_resolver = _make_resolver(["93.184.216.34"])

    def big_body_connector(host: str, ip: str, port: int, path: str, timeout: float) -> tuple[int, dict[str, str], Any]:
        return 200, {}, io.BytesIO(b"a" * 100)

    res = fetch_public(
        "https://example.com/big.sh",
        resolver=public_resolver,
        connector=big_body_connector,
        max_bytes=50,
    )
    assert res.status == "failed"
    assert res.reason == "El script remoto supera el tamaño máximo"


def test_fetch_non_200_failed() -> None:
    public_resolver = _make_resolver(["93.184.216.34"])

    def not_found_connector(
        host: str, ip: str, port: int, path: str, timeout: float
    ) -> tuple[int, dict[str, str], Any]:
        return 404, {}, io.BytesIO(b"not found")

    res = fetch_public(
        "https://example.com/missing.sh",
        resolver=public_resolver,
        connector=not_found_connector,
    )
    assert res.status == "failed"
    assert res.reason == "Respuesta HTTP 404"


def test_fetch_connector_error_failed() -> None:
    public_resolver = _make_resolver(["93.184.216.34"])

    def failing_connector(host: str, ip: str, port: int, path: str, timeout: float) -> tuple[int, dict[str, str], Any]:
        raise OSError("Connection reset by peer")

    res = fetch_public(
        "https://example.com/script.sh",
        resolver=public_resolver,
        connector=failing_connector,
    )
    assert res.status == "failed"
    assert res.reason == "Error de conexión o tiempo de espera agotado"


def test_fetch_total_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    public_resolver = _make_resolver(["93.184.216.34"])
    current_time = 0.0

    def fake_monotonic() -> float:
        return current_time

    monkeypatch.setattr("auditor_worker.fetch.time.monotonic", fake_monotonic)

    class SlowReader:
        def read(self, _size: int = -1) -> bytes:
            nonlocal current_time
            current_time += 1.0
            return b"x"

        def close(self) -> None:
            pass

    def slow_connector(host: str, ip: str, port: int, path: str, timeout: float) -> tuple[int, dict[str, str], Any]:
        return 200, {}, SlowReader()

    res = fetch_public(
        "https://example.com/slow.sh",
        resolver=public_resolver,
        connector=slow_connector,
        total_timeout=5.0,
        max_bytes=1000,
    )
    assert res.status == "failed"
    assert res.reason == "La descarga del script remoto tardó demasiado"
