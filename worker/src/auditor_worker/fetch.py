"""Public remote script fetcher with strict SSRF protection and resource limits."""

import contextlib
import http.client
import ipaddress
import socket
import ssl
import time
import urllib.parse
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, BinaryIO, Literal


@dataclass
class FetchResult:
    """Result of attempting to fetch a public remote resource."""

    status: Literal["ok", "blocked", "failed"]
    data: bytes | None
    final_url: str | None
    reason: str | None


def validate_target(
    url: str,
    resolver: Callable[..., list[Any]] = socket.getaddrinfo,
) -> tuple[str, str, int, str] | str:
    """Validate that the target URL is a safe public HTTPS endpoint.

    Returns:
        tuple[str, str, int, str]: (host, first_ip, port, path_and_query) if valid.
        str: Reason description in Spanish if blocked.
    """
    try:
        parsed = urllib.parse.urlsplit(url)
    except Exception:
        return "URL no válida"

    scheme = (parsed.scheme or "").lower()
    if scheme != "https":
        return "Solo se permiten conexiones HTTPS"

    host = parsed.hostname
    if not host:
        return "La URL no tiene host válido"

    if parsed.username or parsed.password:
        return "La URL no debe incluir credenciales"

    port = parsed.port
    if port is not None and port != 443:
        return "Solo se permite el puerto 443"

    try:
        addrs = resolver(host, 443, type=socket.SOCK_STREAM)
    except Exception:
        return "No se pudo resolver el nombre de host"

    if not addrs:
        return "No se encontraron direcciones para el host"

    # Validate that ALL resolved addresses are strictly global and not multicast
    for item in addrs:
        sockaddr = item[4]
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
            if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
                ip = ip.ipv4_mapped
            if not (ip.is_global and not ip.is_multicast):
                return "La dirección IP no es pública o está restringida"
        except ValueError:
            return "Dirección IP no válida"

    first_ip = addrs[0][4][0]
    path_and_query = parsed.path or "/"
    if parsed.query:
        path_and_query = f"{path_and_query}?{parsed.query}"

    return (host, first_ip, 443, path_and_query)


def default_connector(
    host: str,
    ip: str,
    port: int,
    path: str,
    timeout: float,
) -> tuple[int, Mapping[str, str], BinaryIO]:
    """Connect to verified IP with TLS certificate verification against the original host."""
    raw_sock = socket.create_connection((ip, port), timeout=timeout)
    try:
        ctx = ssl.create_default_context()
        ssl_sock = ctx.wrap_socket(raw_sock, server_hostname=host)
        conn = http.client.HTTPSConnection(host, port=port, timeout=timeout)
        conn.sock = ssl_sock
        conn.request(
            "GET",
            path,
            headers={
                "Host": host,
                "User-Agent": "auditor-skills-worker",
                "Accept": "*/*",
                "Connection": "close",
            },
        )
        resp = conn.getresponse()
        return resp.status, resp.headers, resp
    except Exception:
        raw_sock.close()
        raise


def _close_quietly(reader: object) -> None:
    close = getattr(reader, "close", None)
    if close is not None:
        with contextlib.suppress(Exception):
            close()


def fetch_public(
    url: str,
    *,
    resolver: Callable[..., list[Any]] = socket.getaddrinfo,
    connector: Callable[[str, str, int, str, float], tuple[int, Mapping[str, str], BinaryIO]] | None = None,
    max_bytes: int = 1_048_576,
    timeout: float = 15.0,
    total_timeout: float = 30.0,
    max_redirects: int = 3,
) -> FetchResult:
    """Safely fetch a public HTTPS URL with SSRF protections and size limits."""
    current_url = url
    redirect_count = 0
    actual_connector = connector or default_connector
    deadline = time.monotonic() + total_timeout

    while True:
        if time.monotonic() > deadline:
            return FetchResult(
                status="failed",
                data=None,
                final_url=current_url,
                reason="La descarga del script remoto tardó demasiado",
            )

        target = validate_target(current_url, resolver)
        if isinstance(target, str):
            return FetchResult(
                status="blocked",
                data=None,
                final_url=current_url,
                reason=target,
            )

        host, ip, port, path = target
        if time.monotonic() > deadline:
            return FetchResult(
                status="failed",
                data=None,
                final_url=current_url,
                reason="La descarga del script remoto tardó demasiado",
            )

        try:
            status, headers, reader = actual_connector(host, ip, port, path, timeout)
        except Exception:
            return FetchResult(
                status="failed",
                data=None,
                final_url=current_url,
                reason="Error de conexión o tiempo de espera agotado",
            )

        if status in (301, 302, 303, 307, 308):
            _close_quietly(reader)
            if redirect_count >= max_redirects:
                return FetchResult(
                    status="failed",
                    data=None,
                    final_url=current_url,
                    reason="Se superó el número máximo de redirecciones",
                )
            location = headers.get("Location") or headers.get("location")
            if not location:
                return FetchResult(
                    status="failed",
                    data=None,
                    final_url=current_url,
                    reason="Respuesta de redirección sin encabezado Location",
                )
            current_url = urllib.parse.urljoin(current_url, location)
            redirect_count += 1
            continue

        if status != 200:
            _close_quietly(reader)
            return FetchResult(
                status="failed",
                data=None,
                final_url=current_url,
                reason=f"Respuesta HTTP {status}",
            )

        try:
            chunks: list[bytes] = []
            total_read = 0
            while True:
                to_read = min(65536, (max_bytes + 1) - total_read)
                chunk = reader.read(to_read)
                if time.monotonic() > deadline:
                    _close_quietly(reader)
                    return FetchResult(
                        status="failed",
                        data=None,
                        final_url=current_url,
                        reason="La descarga del script remoto tardó demasiado",
                    )
                if not chunk:
                    break
                chunks.append(chunk)
                total_read += len(chunk)
                if total_read > max_bytes:
                    return FetchResult(
                        status="failed",
                        data=None,
                        final_url=current_url,
                        reason="El script remoto supera el tamaño máximo",
                    )
            return FetchResult(
                status="ok",
                data=b"".join(chunks),
                final_url=current_url,
                reason=None,
            )
        except Exception:
            return FetchResult(
                status="failed",
                data=None,
                final_url=current_url,
                reason="Error al leer los datos de la respuesta",
            )
        finally:
            _close_quietly(reader)


__all__ = ["FetchResult", "default_connector", "fetch_public", "validate_target"]
