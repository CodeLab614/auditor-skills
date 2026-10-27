"""Rule engine orchestrator for static analysis."""

import re

from auditor_worker.findings import Finding
from auditor_worker.inventory import InventoryItem
from auditor_worker.rules import (
    execution,
    filesystem,
    install,
    markdown,
    network,
    obfuscation,
    secrets,
)
from auditor_worker.rules.structure import scan_structure

TAGGED_SHELL_LANGS: set[str] = {"sh", "bash", "shell", "zsh", "console"}
UNTAGGED_ALLOWED_RULES: set[str] = {
    "net.http",
    "install.remote-script",
    "install.package",
    "obf.decode-exec",
    "fs.persistence",
}
FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")


def _extract_markdown_code_blocks(
    text: str,
) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    """Extract lines inside fenced code blocks, separated into tagged shell and untagged."""
    lines = text.splitlines()
    tagged_shell_lines: list[tuple[int, str]] = []
    untagged_lines: list[tuple[int, str]] = []
    in_fence = False
    fence_char = ""
    fence_len = 0
    current_fence: str | None = None

    for line_no, raw_line in enumerate(lines, start=1):
        if not in_fence:
            m = FENCE_RE.match(raw_line)
            if m:
                in_fence = True
                fence_str = m.group(1)
                fence_char = fence_str[0]
                fence_len = len(fence_str)
                info = m.group(2).strip().split()
                lang = info[0].lower() if info else ""
                if lang in TAGGED_SHELL_LANGS:
                    current_fence = "tagged_shell"
                elif lang == "":
                    current_fence = "untagged"
                else:
                    current_fence = None
        else:
            closing_pattern = rf"^ {{0,3}}{re.escape(fence_char * fence_len)}+[ \t]*$"
            if re.match(closing_pattern, raw_line):
                in_fence = False
                current_fence = None
            elif current_fence is not None:
                line_content = raw_line
                if line_content.startswith("$ "):
                    line_content = line_content[2:]
                elif line_content.lstrip().startswith("$ "):
                    indent = len(line_content) - len(line_content.lstrip())
                    line_content = line_content[:indent] + line_content[indent + 2 :]
                if current_fence == "tagged_shell":
                    tagged_shell_lines.append((line_no, line_content))
                else:
                    untagged_lines.append((line_no, line_content))

    return tagged_shell_lines, untagged_lines


def markdown_code_lines(text: str) -> list[tuple[int, str, bool]]:
    """Extract code lines from markdown code blocks as (line_no, content, is_tagged_shell)."""
    tagged, untagged = _extract_markdown_code_blocks(text)
    combined: list[tuple[int, str, bool]] = [(line_no, content, True) for line_no, content in tagged] + [
        (line_no, content, False) for line_no, content in untagged
    ]
    combined.sort(key=lambda item: item[0])
    return combined


def scan(item: InventoryItem, text: str) -> tuple[list[Finding], int]:
    """Scan an inventory item text with applicable rule families.

    Returns:
        tuple[list[Finding], int]: Findings sorted by line number, and count of suppressed findings.
    """
    if item.kind in {"binary", "image"}:
        return ([], 0)

    all_findings: list[Finding] = []

    if item.kind == "markdown":
        tagged_shell_lines, untagged_lines = _extract_markdown_code_blocks(text)
        if tagged_shell_lines:
            all_findings.extend(network.scan_lines(item.path, "shell", tagged_shell_lines))
            all_findings.extend(execution.scan_lines(item.path, "shell", tagged_shell_lines))
            all_findings.extend(install.scan_lines(item.path, "shell", tagged_shell_lines))
            all_findings.extend(secrets.scan_lines(item.path, "shell", tagged_shell_lines))
            all_findings.extend(filesystem.scan_lines(item.path, "shell", tagged_shell_lines))
            all_findings.extend(obfuscation.scan_lines(item.path, "shell", tagged_shell_lines))

        if untagged_lines:
            untagged_findings: list[Finding] = []
            untagged_findings.extend(network.scan_lines(item.path, "shell", untagged_lines))
            untagged_findings.extend(install.scan_lines(item.path, "shell", untagged_lines))
            untagged_findings.extend(obfuscation.scan_lines(item.path, "shell", untagged_lines))
            untagged_findings.extend(filesystem.scan_lines(item.path, "shell", untagged_lines))
            all_findings.extend(f for f in untagged_findings if f.rule_id in UNTAGGED_ALLOWED_RULES)

        all_findings.extend(markdown.scan_markdown(item.path, text))

    elif item.language in {"python", "js", "shell", "powershell"}:
        lines = [(idx, line) for idx, line in enumerate(text.splitlines(), start=1)]
        all_findings.extend(network.scan_lines(item.path, item.language, lines))
        all_findings.extend(execution.scan_lines(item.path, item.language, lines))
        all_findings.extend(install.scan_lines(item.path, item.language, lines))
        all_findings.extend(secrets.scan_lines(item.path, item.language, lines))
        all_findings.extend(filesystem.scan_lines(item.path, item.language, lines))
        all_findings.extend(obfuscation.scan_lines(item.path, item.language, lines))

    else:
        # Config or loose text (language is config or None):
        # Only net.http, install.remote-script, secrets.path, and fs.persistence apply
        lang = item.language or "other"
        lines = [(idx, line) for idx, line in enumerate(text.splitlines(), start=1)]
        all_findings.extend(network.scan_lines(item.path, lang, lines))
        all_findings.extend(install.scan_lines(item.path, lang, lines))
        all_findings.extend(secrets.scan_lines(item.path, lang, lines))
        all_findings.extend(filesystem.scan_lines(item.path, lang, lines))

    # Sort all findings by line number and rule_id
    all_findings.sort(key=lambda f: (f.line, f.rule_id))

    # Cap at 20 findings per (rule_id, file)
    rule_counts: dict[str, int] = {}
    kept: list[Finding] = []
    suppressed = 0

    for f in all_findings:
        count = rule_counts.get(f.rule_id, 0)
        if count < 20:
            rule_counts[f.rule_id] = count + 1
            kept.append(f)
        else:
            suppressed += 1

    return kept, suppressed


__all__ = ["markdown_code_lines", "scan", "scan_structure"]
