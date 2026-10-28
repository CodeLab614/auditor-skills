"""Markdown rules: md.invisible, md.html-comment, md.encoded, md.exfil-instruction, md.secret-mention, and md.url."""

import re

from auditor_worker.findings import Finding, make_evidence
from auditor_worker.rules.patterns import (
    BLOB_BASE64_RE,
    BLOB_HEX_RE,
    DOTENV_RE,
    SECRET_PATHS,
    URL_RE,
    host_of,
    is_secret_env_name,
)

FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
EXFIL_VERBS_RE = re.compile(
    r"(?i)\b(?:send(?:s|ing)?|upload(?:s|ing)?|post(?:s|ing)?|curl|paste|exfiltrate|"
    r"enviar|envía|envia|envíalo|envialo|subir|sube|pegar|pega)\b"
)
EXFIL_EXCLUSION_KEYWORDS: tuple[str, ...] = (
    "exclud",
    "ignor",
    "skip",
    "never",
    "without",
    "except",
    "do not",
    "don't",
    "not ",
    "nunca",
    "sin ",
    "excepto",
    "excluy",
    "ignora",
    "omit",
)
UPPER_VAR_RE = re.compile(r"\b([A-Z][A-Z0-9_]*)\b")


def _find_invisible_codepoints(line: str, line_no: int, file_starts_with_bom: bool) -> list[str]:
    """Find invisible and bidirectional codepoints in line, ignoring BOM only at file offset 0."""
    cps: set[int] = set()
    for char_idx, char in enumerate(line):
        cp = ord(char)
        if (
            (0x200B <= cp <= 0x200F)
            or (0x202A <= cp <= 0x202E)
            or (0x2060 <= cp <= 0x2064)
            or (0x2066 <= cp <= 0x2069)
            or (cp == 0xFEFF and not (line_no == 1 and char_idx == 0 and file_starts_with_bom))
        ):
            cps.add(cp)
    return [f"U+{cp:04X}" for cp in sorted(cps)]


def _find_secret_in_line(line: str) -> str | None:
    """Find any secret path or uppercase secret environment variable name in line."""
    for sp in sorted(SECRET_PATHS, key=len, reverse=True):
        if sp in line:
            m = re.search(r"[^\s\"'<>()]*" + re.escape(sp) + r"[^\s\"'<>()]*", line)
            if m:
                return m.group(0).rstrip(".,;:)")
            return sp

    if DOTENV_RE.search(line):
        return ".env"

    for m in UPPER_VAR_RE.finditer(line):
        var_name = m.group(1)
        if is_secret_env_name(var_name):
            return var_name

    return None


def scan_markdown(path: str, text: str) -> list[Finding]:
    """Scan an entire markdown document with md.* rules."""
    lines = text.splitlines()
    findings: list[Finding] = []
    file_starts_with_bom = text.startswith("\ufeff")

    # 1. Identify lines inside fenced code blocks
    in_fence = False
    fence_char = ""
    fence_len = 0
    is_in_code: list[bool] = [False] * len(lines)

    for idx, raw_line in enumerate(lines):
        if not in_fence:
            m = FENCE_RE.match(raw_line)
            if m:
                in_fence = True
                fence_str = m.group(1)
                fence_char = fence_str[0]
                fence_len = len(fence_str)
                is_in_code[idx] = True
        else:
            is_in_code[idx] = True
            closing_pattern = rf"^ {{0,3}}{re.escape(fence_char * fence_len)}+[ \t]*$"
            if re.match(closing_pattern, raw_line):
                in_fence = False

    seen_domains: set[str] = set()
    in_html_comment = False

    # 2. Scan lines for markdown rules
    for idx, line in enumerate(lines):
        line_no = idx + 1
        evidence = make_evidence(line)
        in_code_block = is_in_code[idx]

        # md.invisible (runs on ANY line, inside or outside code blocks)
        invisible_cps = _find_invisible_codepoints(line, line_no, file_starts_with_bom)
        if invisible_cps:
            findings.append(
                Finding(
                    rule_id="md.invisible",
                    category="markdown",
                    severity_undeclared="high",
                    severity_declared="high",
                    file_path=path,
                    line=line_no,
                    title=f"Caracteres invisibles en el Markdown: {', '.join(invisible_cps)}",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )

        # md.encoded (runs on ANY line, inside or outside code blocks)
        if BLOB_BASE64_RE.search(line) or BLOB_HEX_RE.search(line):
            findings.append(
                Finding(
                    rule_id="md.encoded",
                    category="markdown",
                    severity_undeclared="high",
                    severity_declared="high",
                    file_path=path,
                    line=line_no,
                    title="Bloque de datos codificados en el Markdown",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )

        # Rules that run ONLY outside code blocks
        if in_code_block:
            continue

        # md.html-comment
        if in_html_comment:
            if "-->" in line:
                in_html_comment = False
                after_close = line.split("-->", 1)[1]
                if "<!--" in after_close:
                    findings.append(
                        Finding(
                            rule_id="md.html-comment",
                            category="markdown",
                            severity_undeclared="high",
                            severity_declared="high",
                            file_path=path,
                            line=line_no,
                            title="Comentario HTML oculto en Markdown",
                            evidence=evidence,
                            token=None,
                            url=None,
                        )
                    )
                    if "-->" not in after_close.split("<!--", 1)[1]:
                        in_html_comment = True
        else:
            if "<!--" in line:
                findings.append(
                    Finding(
                        rule_id="md.html-comment",
                        category="markdown",
                        severity_undeclared="high",
                        severity_declared="high",
                        file_path=path,
                        line=line_no,
                        title="Comentario HTML oculto en Markdown",
                        evidence=evidence,
                        token=None,
                        url=None,
                    )
                )
                after_open = line.split("<!--", 1)[1]
                if "-->" not in after_open:
                    in_html_comment = True

        # md.exfil-instruction and md.secret-mention
        secret = _find_secret_in_line(line)
        if secret:
            has_exfil = EXFIL_VERBS_RE.search(line) is not None
            line_lower = line.lower()
            has_exclusion = any(kw in line_lower for kw in EXFIL_EXCLUSION_KEYWORDS)
            if has_exfil and not has_exclusion:
                findings.append(
                    Finding(
                        rule_id="md.exfil-instruction",
                        category="markdown",
                        severity_undeclared="critical",
                        severity_declared="critical",
                        file_path=path,
                        line=line_no,
                        title=f"Instrucción para enviar secretos ({secret})",
                        evidence=evidence,
                        token=secret,
                        url=None,
                    )
                )
            else:
                findings.append(
                    Finding(
                        rule_id="md.secret-mention",
                        category="markdown",
                        severity_undeclared="low",
                        severity_declared="low",
                        file_path=path,
                        line=line_no,
                        title=f"Mención de ruta o variable sensible {secret}",
                        evidence=evidence,
                        token=secret,
                        url=None,
                    )
                )

        # md.url (one finding per domain and file)
        for m in URL_RE.finditer(line):
            found_url = m.group(0)
            domain = host_of(found_url)
            if domain and domain not in seen_domains:
                seen_domains.add(domain)
                findings.append(
                    Finding(
                        rule_id="md.url",
                        category="markdown",
                        severity_undeclared="low",
                        severity_declared="low",
                        file_path=path,
                        line=line_no,
                        title=f"Enlace externo a {domain}",
                        evidence=evidence,
                        token=domain,
                        url=found_url,
                    )
                )

    findings.sort(key=lambda f: (f.line, f.rule_id))
    return findings


__all__ = ["scan_markdown"]
