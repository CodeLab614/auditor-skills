"""Execution rules: exec.command and exec.dynamic."""

import re

from auditor_worker.findings import Finding, make_evidence
from auditor_worker.rules.patterns import sanitize_placeholders

PY_EXEC_CMD = re.compile(
    r"\b(?:subprocess\.(?:run|call|Popen|check_output|check_call)|os\.(?:system|popen|exec[a-z]*))\("
)
JS_EXEC_CMD = re.compile(r"\b(?:child_process\b|execSync\(|execFileSync\(|spawnSync\(|spawn\(|execFile\(|exec\()")

PY_EXEC_DYNAMIC = re.compile(r"(?:(?<!\.)\b(?:eval|exec|compile)\(|\b__import__\()")
JS_EXEC_DYNAMIC = re.compile(r"(?:(?<!\.)\beval\(|new\s+Function\(|\bvm\.runIn)")
SHELL_EXEC_DYNAMIC = re.compile(r"(?:\beval\b|\b(?:sh|bash|zsh)\s+-c\s+[\"'][^\"']*\$)")
PS_EXEC_DYNAMIC = re.compile(r"(?i)\b(?:Invoke-Expression|iex)\b")


def _extract_exec_token(line: str, start_pos: int) -> str | None:
    sub = line[start_pos:]
    # Check for list literal first: ["cmd", ...] or ['cmd', ...]
    list_match = re.search(r"\[\s*[\"']([^\"']+)[\"']", sub)
    if list_match:
        cmd = list_match.group(1).strip()
        return cmd.split()[0] if cmd else None

    # Check for string literal: ("cmd ...", ...) or ('cmd ...', ...)
    str_match = re.search(r"\(\s*[\"']([^\"']+)[\"']", sub)
    if str_match:
        cmd = str_match.group(1).strip()
        return cmd.split()[0] if cmd else None

    return None


def scan_lines(path: str, language: str, lines: list[tuple[int, str]]) -> list[Finding]:
    """Scan lines for exec.command and exec.dynamic rules."""
    findings: list[Finding] = []

    for line_no, line in lines:
        evidence = make_evidence(line)
        scan_line = sanitize_placeholders(line) if language == "shell" else line

        # 1. exec.command: Python and JS only, never in shell or powershell
        if language in {"python", "js"}:
            cmd_match = PY_EXEC_CMD.search(line) if language == "python" else JS_EXEC_CMD.search(line)
            if cmd_match:
                token = _extract_exec_token(line, cmd_match.start())
                title = f"Ejecución del comando {token}" if token else "Ejecución de comando"
                findings.append(
                    Finding(
                        rule_id="exec.command",
                        category="exec",
                        severity_undeclared="low",
                        severity_declared="low",
                        file_path=path,
                        line=line_no,
                        title=title,
                        evidence=evidence,
                        token=token,
                        url=None,
                    )
                )

        # 2. exec.dynamic: per language patterns
        has_dynamic = False
        if language == "python":
            has_dynamic = PY_EXEC_DYNAMIC.search(line) is not None
        elif language == "js":
            has_dynamic = JS_EXEC_DYNAMIC.search(line) is not None
        elif language == "shell":
            has_dynamic = SHELL_EXEC_DYNAMIC.search(scan_line) is not None
        elif language == "powershell":
            has_dynamic = PS_EXEC_DYNAMIC.search(line) is not None

        if has_dynamic:
            findings.append(
                Finding(
                    rule_id="exec.dynamic",
                    category="exec",
                    severity_undeclared="medium",
                    severity_declared="medium",
                    file_path=path,
                    line=line_no,
                    title="Ejecución dinámica de código",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )

    return findings


__all__ = ["scan_lines"]
