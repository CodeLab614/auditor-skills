"""Filesystem rules: fs.delete-outside, fs.write-outside, and fs.persistence."""

import re

from auditor_worker.findings import Finding, make_evidence
from auditor_worker.rules.patterns import (
    OUTSIDE_PATH_EXPRESSIONS,
    PERSISTENCE_COMMANDS,
    PERSISTENCE_PATHS,
    is_outside_path,
    mask_shell_redirects,
    sanitize_placeholders,
)

# Shell commands and redirections
SHELL_DEL_RE = re.compile(r"\b(?:rm|rmdir|shred|unlink)\b")
SHELL_REDIR_RE = re.compile(r"(?:(?<![0-9])(?:2>>|2>(?!&)|>>|>(?!&))|&>>|&>(?!&)|>&(?!\d))\s*([^\s;&|]+)")
SHELL_TEE_RE = re.compile(r"\btee\b(?:\s+-a)?\s+([^\s;&|]+)")
SHELL_CP_MV_LN_RE = re.compile(r"\b(?:cp|mv|install|ln)\b")
SHELL_MKDIR_TOUCH_RE = re.compile(r"\b(?:mkdir|touch)\b")

# Python file operation patterns
PY_DEL_OPERATIONS: tuple[str, ...] = (
    "shutil.rmtree(",
    "os.remove(",
    "os.unlink(",
    "os.rmdir(",
    ".unlink(",
    ".rmdir(",
)
PY_OPEN_RE = re.compile(r"""\bopen\s*\(\s*(['"][^'"]+['"]|[^,]+)\s*,\s*['"]([waxb+]+)['"]""")
PY_OPEN_KW_RE = re.compile(r"""\bopen\s*\(\s*(['"][^'"]+['"]|[^,]+)[^)]*mode\s*=\s*['"]([waxb+]+)['"]""")
PY_WRITE_TEXT_BYTES: tuple[str, ...] = (".write_text(", ".write_bytes(")
PY_SHUTIL_COPY_RE = re.compile(r"""\bshutil\.(?:copy[a-z0-9]*|move)\s*\(\s*[^,]+,\s*(['"][^'"]+['"]|[^,\)]+)""")

# JavaScript file operation patterns
JS_DEL_OPERATIONS: tuple[str, ...] = ("fs.rm(", "fs.rmSync(", "fs.unlink", "fs.rmdir", "rimraf")
JS_FS_WRITE_1ST_RE = re.compile(
    r"\b(?:fs(?:\.promises)?\.(?:writeFile|appendFile)[A-Za-z0-9_]*|createWriteStream)"
    r"\s*\(\s*(['\"][^'\"]+['\"]|`[^`]+`|[^,\)]+)"
)
JS_FS_COPY_2ND_RE = re.compile(
    r"""\bfs(?:\.promises)?\.(?:copyFile|rename)[A-Za-z0-9_]*\s*\(\s*[^,]+,\s*(['"][^'"]+['"]|`[^`]+`|[^,\)]+)"""
)

# PowerShell file operation patterns
PS_DEL_RE = re.compile(r"(?i)\b(?:Remove-Item|rm|del|rd)\b")
PS_WRITE_RE = re.compile(r"(?i)\b(?:Set-Content|Add-Content|Out-File|Copy-Item|Move-Item|New-Item)\b")


def _extract_string_literals(line: str) -> list[str]:
    """Extract string literal contents from single- and double-quoted strings."""
    results: list[str] = []
    for m in re.finditer(r"'([^']*)'|\"([^\"]*)\"", line):
        lit = m.group(1) if m.group(1) is not None else m.group(2)
        if lit:
            results.append(lit)
    return results


def _split_shell_args(line: str) -> list[str]:
    """Split line into rough shell arguments while preserving quotes."""
    return re.findall(r"""[^\s"']+|"[^"]*"|'[^']*'""", line)


def _check_persistence_path_in_str(s: str) -> str | None:
    """Check if a string matches or contains any persistence path."""
    cleaned = s.strip("'\"")
    for pp in PERSISTENCE_PATHS:
        if pp.endswith("/"):
            if pp in cleaned or cleaned.endswith(pp.rstrip("/")):
                return cleaned if is_outside_path(cleaned) else pp
        else:
            if cleaned == pp or cleaned.endswith("/" + pp) or (pp in cleaned and is_outside_path(cleaned)):
                return cleaned if is_outside_path(cleaned) else pp
    return None


def _check_persistence_command(line: str) -> str | None:
    """Check if the line invokes a system persistence command."""
    for cmd in PERSISTENCE_COMMANDS:
        if cmd == "crontab":
            if re.search(r"\bcrontab\b", line):
                if re.search(r"\bcrontab\s+-l\b", line):
                    continue
                return "crontab"
        elif cmd in line:
            return cmd
    return None


def _find_outside_token_in_line(line: str, language: str) -> str | None:
    """Find any outside path literal or expression in the line."""
    literals = _extract_string_literals(line)
    for lit in literals:
        if is_outside_path(lit):
            return lit

    if language in {"shell", "powershell"}:
        for tok in _split_shell_args(line):
            cleaned = tok.strip("'\"")
            if is_outside_path(cleaned):
                return cleaned

    for expr in OUTSIDE_PATH_EXPRESSIONS:
        if expr in line:
            return expr

    return None


def scan_lines(path: str, language: str, lines: list[tuple[int, str]]) -> list[Finding]:
    """Scan lines for fs.delete-outside, fs.write-outside, and fs.persistence rules."""
    findings: list[Finding] = []
    is_code = language in {"python", "js", "shell", "powershell"}

    for line_no, line in lines:
        evidence = make_evidence(line)
        scan_line = mask_shell_redirects(sanitize_placeholders(line)) if language == "shell" else line

        # ---------------------------------------------------------------------
        # Non-code files (config, None, other): only fs.persistence applies
        # ---------------------------------------------------------------------
        if not is_code:
            cmd = _check_persistence_command(line)
            if cmd:
                findings.append(
                    Finding(
                        rule_id="fs.persistence",
                        category="filesystem",
                        severity_undeclared="critical",
                        severity_declared="medium",
                        file_path=path,
                        line=line_no,
                        title=f"Configuración de persistencia en {cmd}",
                        evidence=evidence,
                        token=cmd,
                        url=None,
                    )
                )
                continue

            for pp in PERSISTENCE_PATHS:
                if pp in line:
                    findings.append(
                        Finding(
                            rule_id="fs.persistence",
                            category="filesystem",
                            severity_undeclared="critical",
                            severity_declared="medium",
                            file_path=path,
                            line=line_no,
                            title=f"Configuración de persistencia en {pp}",
                            evidence=evidence,
                            token=pp,
                            url=None,
                        )
                    )
                    break
            continue

        # ---------------------------------------------------------------------
        # Code files: 1. fs.persistence
        # ---------------------------------------------------------------------
        has_persistence = False
        pers_token: str | None = None

        # A) Persistence command check
        pers_cmd = _check_persistence_command(scan_line)
        if pers_cmd:
            has_persistence = True
            pers_token = pers_cmd

        # B) Write operation targeting a persistence path
        if not has_persistence:
            if language == "shell":
                for m_redir in SHELL_REDIR_RE.finditer(scan_line):
                    match_path = _check_persistence_path_in_str(m_redir.group(1))
                    if match_path:
                        has_persistence = True
                        pers_token = match_path
                        break

                if not has_persistence and re.search(r"\btee\b", scan_line):
                    args = [a for a in _split_shell_args(scan_line.split("tee", 1)[1]) if not a.startswith("-")]
                    if args:
                        match_path = _check_persistence_path_in_str(args[0])
                        if match_path:
                            has_persistence = True
                            pers_token = match_path

                if not has_persistence and SHELL_CP_MV_LN_RE.search(scan_line):
                    args = [a for a in _split_shell_args(scan_line) if not a.startswith("-")]
                    if len(args) >= 2:
                        match_path = _check_persistence_path_in_str(args[-1])
                        if match_path:
                            has_persistence = True
                            pers_token = match_path

                if not has_persistence and SHELL_MKDIR_TOUCH_RE.search(scan_line):
                    for a in _split_shell_args(scan_line):
                        if not a.startswith("-"):
                            match_path = _check_persistence_path_in_str(a)
                            if match_path:
                                has_persistence = True
                                pers_token = match_path
                                break

            elif language == "python":
                m_open = PY_OPEN_RE.search(line) or PY_OPEN_KW_RE.search(line)
                if m_open and any(m in m_open.group(2) for m in ("w", "a", "x")):
                    match_path = _check_persistence_path_in_str(m_open.group(1))
                    if match_path:
                        has_persistence = True
                        pers_token = match_path

                if not has_persistence and any(op in line for op in PY_WRITE_TEXT_BYTES):
                    for lit in _extract_string_literals(line):
                        match_path = _check_persistence_path_in_str(lit)
                        if match_path:
                            has_persistence = True
                            pers_token = match_path
                            break

                if not has_persistence:
                    m_copy = PY_SHUTIL_COPY_RE.search(line)
                    if m_copy:
                        match_path = _check_persistence_path_in_str(m_copy.group(1))
                        if match_path:
                            has_persistence = True
                            pers_token = match_path

            elif language == "js":
                m_write = JS_FS_WRITE_1ST_RE.search(line)
                if m_write:
                    match_path = _check_persistence_path_in_str(m_write.group(1))
                    if match_path:
                        has_persistence = True
                        pers_token = match_path

                if not has_persistence:
                    m_copy = JS_FS_COPY_2ND_RE.search(line)
                    if m_copy:
                        match_path = _check_persistence_path_in_str(m_copy.group(1))
                        if match_path:
                            has_persistence = True
                            pers_token = match_path

            elif language == "powershell" and PS_WRITE_RE.search(line):
                for tok in _split_shell_args(line):
                    match_path = _check_persistence_path_in_str(tok)
                    if match_path:
                        has_persistence = True
                        pers_token = match_path
                        break

        if has_persistence:
            findings.append(
                Finding(
                    rule_id="fs.persistence",
                    category="filesystem",
                    severity_undeclared="critical",
                    severity_declared="medium",
                    file_path=path,
                    line=line_no,
                    title=f"Configuración de persistencia en {pers_token}"
                    if pers_token
                    else "Configuración de persistencia en el sistema",
                    evidence=evidence,
                    token=pers_token,
                    url=None,
                )
            )

        # ---------------------------------------------------------------------
        # Code files: 2. fs.delete-outside
        # ---------------------------------------------------------------------
        has_delete = False
        del_token: str | None = None

        if language == "shell":
            if SHELL_DEL_RE.search(scan_line):
                del_token = _find_outside_token_in_line(scan_line, "shell")
                if del_token:
                    has_delete = True

        elif language == "python":
            if any(op in line for op in PY_DEL_OPERATIONS):
                del_token = _find_outside_token_in_line(line, "python")
                if del_token:
                    has_delete = True

        elif language == "js":
            if any(op in line for op in JS_DEL_OPERATIONS):
                del_token = _find_outside_token_in_line(line, "js")
                if del_token:
                    has_delete = True

        elif language == "powershell":
            if PS_DEL_RE.search(line):
                del_token = _find_outside_token_in_line(line, "powershell")
                if del_token:
                    has_delete = True

        if has_delete:
            findings.append(
                Finding(
                    rule_id="fs.delete-outside",
                    category="filesystem",
                    severity_undeclared="critical",
                    severity_declared="medium",
                    file_path=path,
                    line=line_no,
                    title=f"Borrado fuera de la carpeta en {del_token}" if del_token else "Borrado fuera de la carpeta",
                    evidence=evidence,
                    token=del_token,
                    url=None,
                )
            )

        # ---------------------------------------------------------------------
        # Code files: 3. fs.write-outside (suppressed if fs.persistence hit)
        # ---------------------------------------------------------------------
        if has_persistence:
            continue

        has_write = False
        write_token: str | None = None

        if language == "shell":
            for m_redir in SHELL_REDIR_RE.finditer(scan_line):
                target = m_redir.group(1).strip("'\"")
                if is_outside_path(target):
                    has_write = True
                    write_token = target
                    break

            if not has_write and re.search(r"\btee\b", scan_line):
                args = [a for a in _split_shell_args(scan_line.split("tee", 1)[1]) if not a.startswith("-")]
                if args and is_outside_path(args[0]):
                    has_write = True
                    write_token = args[0].strip("'\"")

            if not has_write and SHELL_CP_MV_LN_RE.search(scan_line):
                args = [a for a in _split_shell_args(scan_line) if not a.startswith("-")]
                if len(args) >= 2 and is_outside_path(args[-1]):
                    has_write = True
                    write_token = args[-1].strip("'\"")

            if not has_write and SHELL_MKDIR_TOUCH_RE.search(scan_line):
                for a in _split_shell_args(scan_line):
                    if not a.startswith("-") and is_outside_path(a):
                        has_write = True
                        write_token = a.strip("'\"")
                        break

        elif language == "python":
            m_open = PY_OPEN_RE.search(line) or PY_OPEN_KW_RE.search(line)
            if m_open and any(m in m_open.group(2) for m in ("w", "a", "x")):
                target = m_open.group(1).strip()
                target_clean = target.strip("'\"")
                if is_outside_path(target_clean):
                    has_write = True
                    write_token = target_clean
                elif any(expr in target for expr in OUTSIDE_PATH_EXPRESSIONS):
                    has_write = True
                    write_token = next(expr for expr in OUTSIDE_PATH_EXPRESSIONS if expr in target)

            if not has_write and any(op in line for op in PY_WRITE_TEXT_BYTES):
                write_token = _find_outside_token_in_line(line, "python")
                if write_token:
                    has_write = True

            if not has_write:
                m_copy = PY_SHUTIL_COPY_RE.search(line)
                if m_copy:
                    dest = m_copy.group(1).strip().strip("'\"")
                    if is_outside_path(dest):
                        has_write = True
                        write_token = dest

        elif language == "js":
            m_write = JS_FS_WRITE_1ST_RE.search(line)
            if m_write:
                target = m_write.group(1).strip().strip("'\"`")
                if is_outside_path(target):
                    has_write = True
                    write_token = target

            if not has_write:
                m_copy = JS_FS_COPY_2ND_RE.search(line)
                if m_copy:
                    dest = m_copy.group(1).strip().strip("'\"`")
                    if is_outside_path(dest):
                        has_write = True
                        write_token = dest

        elif language == "powershell" and PS_WRITE_RE.search(line):
            write_token = _find_outside_token_in_line(line, "powershell")
            if write_token:
                has_write = True

        if has_write:
            findings.append(
                Finding(
                    rule_id="fs.write-outside",
                    category="filesystem",
                    severity_undeclared="high",
                    severity_declared="medium",
                    file_path=path,
                    line=line_no,
                    title=f"Escritura fuera de la carpeta en {write_token}"
                    if write_token
                    else "Escritura fuera de la carpeta",
                    evidence=evidence,
                    token=write_token,
                    url=None,
                )
            )

    return findings


__all__ = ["scan_lines"]
