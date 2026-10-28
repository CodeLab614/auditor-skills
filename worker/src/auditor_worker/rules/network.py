"""Network rules: net.http, net.dynamic, and net.dns."""

import re

from auditor_worker.findings import Finding, make_evidence
from auditor_worker.rules.patterns import URL_RE, host_of, sanitize_placeholders

# HTTP call patterns per language
PY_HTTP_CALL = re.compile(
    r"(?:\brequests\.[a-zA-Z_]+\(|\burlopen\(|\burllib\.request\b|\bhttpx\.|\baiohttp\b|\bHTTPSConnection\(|\bHTTPConnection\()"
)
JS_HTTP_CALL = re.compile(r"(?:\bfetch\(|\baxios\b|\bhttps?\.get\(|\bhttps?\.request\(|\bgot\(|\bXMLHttpRequest\b)")
JS_RELATIVE_HTTP_RE = re.compile(r"""(?:fetch|axios(?:\.[a-zA-Z_]+)?|got)\s*\(\s*['"`](?:\.\./|\./|/(?!/))""")
SHELL_HTTP_CALL = re.compile(r"\b(?:curl|wget)\b")
PS_HTTP_CALL = re.compile(r"(?i)\b(?:Invoke-WebRequest|Invoke-RestMethod|iwr|irm|curl)\b")
GENERIC_HTTP_CALL = re.compile(r"\b(?:curl|wget)\b")

# Sockets and raw network connections
SOCKET_CALL = re.compile(
    r"(?:\bsocket\.socket\(|\.connect\(\(|\bcreate_connection\(|\bnet\.connect\(|\bnet\.createConnection\(|new\s+WebSocket\()"
)
SHELL_NC_CALL = re.compile(r"\b(?:nc|ncat)\s+")

# DNS lookup patterns
DNS_CALL = re.compile(
    r"(?i)(?:\b(?:dig|nslookup|Resolve-DnsName)\b|\bgethostbyname\(|\bgetaddrinfo\(|\bdns\.resolve[a-zA-Z0-9_]*|\bdns\.lookup\b)"
)
DNS_HOST_CALL_RE = re.compile(
    r'(?:gethostbyname|getaddrinfo|dns\.resolve[a-zA-Z0-9_]*|dns\.lookup)\s*\(\s*["\']([^"\']+)["\']'
)
DNS_CLI_RE = re.compile(
    r"\b(?:dig|nslookup|Resolve-DnsName)\b(?:\s+-[^\s]+)*\s+([a-zA-Z0-9.\-_]+)",
    re.IGNORECASE,
)


def _has_http_call(line: str, language: str) -> bool:
    if language == "python":
        return PY_HTTP_CALL.search(line) is not None
    if language == "js":
        return JS_HTTP_CALL.search(line) is not None
    if language == "shell":
        return SHELL_HTTP_CALL.search(line) is not None
    if language == "powershell":
        return PS_HTTP_CALL.search(line) is not None
    return GENERIC_HTTP_CALL.search(line) is not None


def scan_lines(path: str, language: str, lines: list[tuple[int, str]]) -> list[Finding]:
    """Scan lines for net.http, net.dynamic, and net.dns rules."""
    findings: list[Finding] = []
    is_code_lang = language in {"python", "js", "shell", "powershell"}

    for line_no, line in lines:
        evidence = make_evidence(line)
        scan_line = sanitize_placeholders(line) if language == "shell" else line
        has_http = _has_http_call(scan_line, language)
        urls = URL_RE.findall(scan_line) if has_http else []

        # 1. net.http: Network call AND literal URL(s)
        if has_http and urls:
            seen_hosts: set[str] = set()
            for url in urls:
                host = host_of(url)
                if host and host not in seen_hosts:
                    seen_hosts.add(host)
                    findings.append(
                        Finding(
                            rule_id="net.http",
                            category="net",
                            severity_undeclared="high",
                            severity_declared="medium",
                            file_path=path,
                            line=line_no,
                            title=f"Petición de red a {host}",
                            evidence=evidence,
                            token=host,
                            url=url,
                        )
                    )

        # Rules below only apply to code languages, not config/other
        if not is_code_lang:
            continue

        # 2. net.dynamic: Sockets / nc, or HTTP call without literal URL
        has_socket = SOCKET_CALL.search(scan_line) is not None or (
            language == "shell" and SHELL_NC_CALL.search(scan_line) is not None
        )
        if has_socket:
            findings.append(
                Finding(
                    rule_id="net.dynamic",
                    category="net",
                    severity_undeclared="high",
                    severity_declared="high",
                    file_path=path,
                    line=line_no,
                    title="Conexión de red por socket o WebSocket",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )
        elif has_http and not urls:
            if not (language == "js" and JS_RELATIVE_HTTP_RE.search(scan_line) is not None):
                findings.append(
                    Finding(
                        rule_id="net.dynamic",
                        category="net",
                        severity_undeclared="high",
                        severity_declared="high",
                        file_path=path,
                        line=line_no,
                        title="Petición de red dinámica sin URL literal",
                        evidence=evidence,
                        token=None,
                        url=None,
                    )
                )

        # 3. net.dns: dig, nslookup, Resolve-DnsName, gethostbyname, etc.
        if DNS_CALL.search(scan_line):
            token: str | None = None
            host_call_match = DNS_HOST_CALL_RE.search(scan_line)
            if host_call_match:
                token = host_call_match.group(1)
            else:
                cli_match = DNS_CLI_RE.search(scan_line)
                if cli_match:
                    candidate = cli_match.group(1)
                    if not candidate.startswith("-"):
                        token = candidate

            title = f"Consulta DNS para {token}" if token else "Consulta DNS"
            findings.append(
                Finding(
                    rule_id="net.dns",
                    category="net",
                    severity_undeclared="high",
                    severity_declared="medium",
                    file_path=path,
                    line=line_no,
                    title=title,
                    evidence=evidence,
                    token=token,
                    url=None,
                )
            )

    return findings


__all__ = ["scan_lines"]
