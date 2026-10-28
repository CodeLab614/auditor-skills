"""Obfuscation rules: obf.decode-exec, obf.blob, and obf.char-build."""

import re

from auditor_worker.findings import Finding, make_evidence
from auditor_worker.rules.patterns import BLOB_BASE64_RE, BLOB_HEX_RE

SHELL_DECODE_PATTERNS: tuple[str, ...] = (
    "base64 -d",
    "base64 --decode",
    "base64 -D",
    "xxd -r",
    "openssl enc -d",
)
SHELL_EXEC_TARGET_RE = re.compile(r"^(?:sudo\s+(?:-E\s+)?)?(?:sh|bash|zsh|dash|ksh|python3?)\b")
SHELL_CMD_SPLIT_RE = re.compile(r";|&&|\|\|")

PY_EXEC_PATTERNS: tuple[str, ...] = ("exec(", "eval(", "compile(")
PY_DECODE_PATTERNS: tuple[str, ...] = (
    "b64decode",
    "bytes.fromhex",
    "codecs.decode",
    "zlib.decompress",
    "marshal.loads",
)

JS_EXEC_PATTERNS: tuple[str, ...] = ("eval(", "new Function(", "vm.run")

PS_EXEC_RE = re.compile(r"(?i)\b(?:iex|Invoke-Expression)\b")
PS_DECODE_RE = re.compile(r"(?i)FromBase64String")


def _has_shell_decode_exec(line: str) -> bool:
    """Check if shell line has piped decode-to-exec stages or eval with base64 -d."""
    if re.search(r"\beval\b", line) and any(dec in line for dec in SHELL_DECODE_PATTERNS):
        return True

    commands = SHELL_CMD_SPLIT_RE.split(line)
    for cmd in commands:
        if "|" not in cmd:
            continue
        stages = cmd.split("|")
        for i in range(len(stages) - 1):
            curr = stages[i].strip()
            if any(dec in curr for dec in SHELL_DECODE_PATTERNS):
                next_target = stages[i + 1].strip()
                if SHELL_EXEC_TARGET_RE.match(next_target):
                    return True
    return False


def _has_python_decode_exec(line: str) -> bool:
    """Check if python line pairs exec/eval/compile with decode utilities."""
    has_exec = any(p in line for p in PY_EXEC_PATTERNS)
    has_decode = any(d in line for d in PY_DECODE_PATTERNS)
    return has_exec and has_decode


def _has_js_decode_exec(line: str) -> bool:
    """Check if JS line pairs dynamic execution with base64/hex decoding."""
    has_exec = any(p in line for p in JS_EXEC_PATTERNS)
    if not has_exec:
        return False
    if "atob(" in line:
        return True
    if "Buffer.from(" in line and ("base64" in line or "hex" in line):
        return True
    return False


def _has_powershell_decode_exec(line: str) -> bool:
    """Check if PowerShell line pairs Invoke-Expression/iex with FromBase64String."""
    return PS_EXEC_RE.search(line) is not None and PS_DECODE_RE.search(line) is not None


def scan_lines(path: str, language: str, lines: list[tuple[int, str]]) -> list[Finding]:
    """Scan lines for obf.decode-exec, obf.blob, and obf.char-build rules."""
    findings: list[Finding] = []

    for line_no, line in lines:
        evidence = make_evidence(line)

        # 1. obf.decode-exec
        decode_exec_hit = False
        if language == "shell":
            decode_exec_hit = _has_shell_decode_exec(line)
        elif language == "python":
            decode_exec_hit = _has_python_decode_exec(line)
        elif language == "js":
            decode_exec_hit = _has_js_decode_exec(line)
        elif language == "powershell":
            decode_exec_hit = _has_powershell_decode_exec(line)

        if decode_exec_hit:
            findings.append(
                Finding(
                    rule_id="obf.decode-exec",
                    category="obfuscation",
                    severity_undeclared="critical",
                    severity_declared="critical",
                    file_path=path,
                    line=line_no,
                    title="Decodificación y ejecución dinámica de código",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )

        # 2. obf.blob (code only)
        if BLOB_BASE64_RE.search(line) or BLOB_HEX_RE.search(line):
            findings.append(
                Finding(
                    rule_id="obf.blob",
                    category="obfuscation",
                    severity_undeclared="medium",
                    severity_declared="medium",
                    file_path=path,
                    line=line_no,
                    title="Bloque de datos codificados en base64 o hexadecimal",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )

        # 3. obf.char-build
        chr_count = line.count("chr(")
        from_char_count = line.count("String.fromCharCode")
        hex_count = line.count(r"\x")
        if chr_count >= 8 or from_char_count >= 8 or hex_count >= 20:
            findings.append(
                Finding(
                    rule_id="obf.char-build",
                    category="obfuscation",
                    severity_undeclared="medium",
                    severity_declared="medium",
                    file_path=path,
                    line=line_no,
                    title="Construcción ofuscada de cadenas mediante caracteres individuales",
                    evidence=evidence,
                    token=None,
                    url=None,
                )
            )

    return findings


__all__ = ["scan_lines"]
