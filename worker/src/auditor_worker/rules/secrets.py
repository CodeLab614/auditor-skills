"""Secrets rules: secrets.path, secrets.env, and secrets.env-dump."""

import re

from auditor_worker.findings import Finding, make_evidence
from auditor_worker.rules.patterns import (
    DOTENV_RE,
    SECRET_PATHS,
    is_secret_env_name,
)

# secrets.env patterns per language
PY_ENV_RE = re.compile(r'\bos\.(?:environ\[|environ\.get\(|getenv\()\s*["\']([a-zA-Z0-9_]+)["\']')
JS_ENV_DOT_RE = re.compile(r"\bprocess\.env\.([a-zA-Z0-9_]+)")
JS_ENV_BRACKET_RE = re.compile(r'\bprocess\.env\[\s*["\']([a-zA-Z0-9_]+)["\']')
SHELL_ENV_BRACE_RE = re.compile(r"\$\{([a-zA-Z0-9_]+)\}")
SHELL_ENV_SIMPLE_RE = re.compile(r"\$([a-zA-Z_][a-zA-Z0-9_]*)")
PS_ENV_RE = re.compile(r"(?i)\$env:([a-zA-Z0-9_]+)")

# secrets.path reading context patterns for .env
SHELL_READ_WORDS_RE = re.compile(r"\b(?:cat|source|less|more|head|tail|grep|cp|scp|xargs|export|curl)\b")
SHELL_DOT_SOURCE_RE = re.compile(r"(?:^|[;&|])\s*\.\s+")
PS_READ_WORDS_RE = re.compile(r"(?i)\b(?:Get-Content|gc|type)\b")
EXCLUDE_PREFIXES = ("--exclude=", "--exclude", "--ignore=", "exclude:")


def _reads_dotenv(line: str, language: str) -> bool:
    """Check whether a line accesses a .env secret file in a readable context."""
    if language in ("config", "other", None):
        return False

    if "startswith(" in line or "endswith(" in line or ".gitignore" in line:
        return False

    if language == "python" and ("load_dotenv(" in line or "dotenv_values(" in line):
        return True

    if language == "js" and ('require("dotenv")' in line or "require('dotenv')" in line or "dotenv.config(" in line):
        return True

    dot_matches = list(DOTENV_RE.finditer(line))
    if not dot_matches:
        return False

    has_non_excluded = False
    for m in dot_matches:
        before = line[: m.start()].rstrip(" '\"")
        if not any(before.endswith(p) for p in EXCLUDE_PREFIXES):
            has_non_excluded = True
            break

    if not has_non_excluded:
        return False

    if language == "shell":
        if SHELL_READ_WORDS_RE.search(line) is not None:
            return True
        if SHELL_DOT_SOURCE_RE.search(line) is not None:
            return True
        for m in dot_matches:
            before = line[: m.start()].rstrip()
            if before.endswith("<"):
                return True
        return False

    if language == "python":
        py_contexts = ("open(", "read_text(", "read_bytes(", "load_dotenv(", "dotenv_values(", "Path(")
        return any(ctx in line for ctx in py_contexts)

    if language == "js":
        js_contexts = ("readFile", "readFileSync", "createReadStream", "dotenv")
        return any(ctx in line for ctx in js_contexts)

    if language == "powershell":
        return PS_READ_WORDS_RE.search(line) is not None

    return False


# secrets.env-dump patterns per language
PY_DUMP_RE = re.compile(
    r"(?:json\.dumps\(os\.environ|str\(os\.environ|repr\(os\.environ|print\(os\.environ|pprint\(os\.environ)"
)
JS_DUMP_RE = re.compile(r"(?:JSON\.stringify\(process\.env|console\.log\(process\.env\)|util\.inspect\(process\.env)")
SHELL_PRINTENV_RE = re.compile(r"\bprintenv(?:\s*$|\s*[;&|>]|\s*\n)")
SHELL_ENV_PIPE_RE = re.compile(r"\benv\s*[|>]")
SHELL_SET_PIPE_RE = re.compile(r"\bset\s*\|")
SHELL_EXPORT_P_RE = re.compile(r"\bexport\s+-p\b")
PS_DUMP_RE = re.compile(r"(?i)\b(?:Get-ChildItem|gci|dir|ls)\s+env:")


def scan_lines(path: str, language: str, lines: list[tuple[int, str]]) -> list[Finding]:
    """Scan lines for secrets.path, secrets.env, and secrets.env-dump rules."""
    findings: list[Finding] = []
    is_code_lang = language in {"python", "js", "shell", "powershell"}

    for line_no, line in lines:
        evidence = make_evidence(line)

        # 1. secrets.path: sensitive files and directories
        # Report at most one per line: first matching path in SECRET_PATHS tuple order,
        # or .env if none match.
        matched_sp: str | None = None
        for sp in SECRET_PATHS:
            if sp in line:
                matched_sp = sp
                break

        if matched_sp is not None:
            findings.append(
                Finding(
                    rule_id="secrets.path",
                    category="secrets",
                    severity_undeclared="high",
                    severity_declared="high",
                    file_path=path,
                    line=line_no,
                    title=f"Acceso a ruta de secretos {matched_sp}",
                    evidence=evidence,
                    token=matched_sp,
                    url=None,
                )
            )
        elif _reads_dotenv(line, language):
            findings.append(
                Finding(
                    rule_id="secrets.path",
                    category="secrets",
                    severity_undeclared="high",
                    severity_declared="high",
                    file_path=path,
                    line=line_no,
                    title="Acceso a ruta de secretos .env",
                    evidence=evidence,
                    token=".env",  # noqa: S106 - rule token, not a credential
                    url=None,
                )
            )

        # secrets.env and secrets.env-dump only run for code languages
        if not is_code_lang:
            continue

        # 2. secrets.env: reading environment variables containing secret keywords
        env_vars: set[str] = set()
        if language == "python":
            for m in PY_ENV_RE.finditer(line):
                env_vars.add(m.group(1))
        elif language == "js":
            for m in JS_ENV_DOT_RE.finditer(line):
                env_vars.add(m.group(1))
            for m in JS_ENV_BRACKET_RE.finditer(line):
                env_vars.add(m.group(1))
        elif language == "shell":
            for m in SHELL_ENV_BRACE_RE.finditer(line):
                env_vars.add(m.group(1))
            for m in SHELL_ENV_SIMPLE_RE.finditer(line):
                env_vars.add(m.group(1))
        elif language == "powershell":
            for m in PS_ENV_RE.finditer(line):
                env_vars.add(m.group(1))

        for var_name in sorted(env_vars):
            if is_secret_env_name(var_name):
                findings.append(
                    Finding(
                        rule_id="secrets.env",
                        category="secrets",
                        severity_undeclared="high",
                        severity_declared="medium",
                        file_path=path,
                        line=line_no,
                        title=f"Lectura de variable de entorno sensible {var_name}",
                        evidence=evidence,
                        token=var_name,
                        url=None,
                    )
                )

        # 3. secrets.env-dump: dumping entire environment
        has_dump = False
        if language == "python":
            has_dump = PY_DUMP_RE.search(line) is not None
        elif language == "js":
            has_dump = JS_DUMP_RE.search(line) is not None
        elif language == "shell":
            has_dump = (
                SHELL_PRINTENV_RE.search(line) is not None
                or SHELL_ENV_PIPE_RE.search(line) is not None
                or SHELL_SET_PIPE_RE.search(line) is not None
                or SHELL_EXPORT_P_RE.search(line) is not None
            )
        elif language == "powershell":
            has_dump = PS_DUMP_RE.search(line) is not None

        if has_dump:
            findings.append(
                Finding(
                    rule_id="secrets.env-dump",
                    category="secrets",
                    severity_undeclared="high",
                    severity_declared="high",
                    file_path=path,
                    line=line_no,
                    title="Volcado completo de variables de entorno",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )

    return findings


__all__ = ["scan_lines"]
