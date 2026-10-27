"""Finding representations and evidence formatting for the rule engine."""

from dataclasses import dataclass
from typing import Literal

Severity = Literal["critical", "high", "medium", "low"]


@dataclass
class Finding:
    """A static analysis finding produced by rules."""

    rule_id: str
    category: str
    severity_undeclared: Severity
    severity_declared: Severity
    file_path: str
    line: int
    title: str
    evidence: str
    token: str | None = None
    url: str | None = None
    version: str | None = None
    declared: bool = False
    severity: Severity | None = None
    ecosystem: str | None = None


def _is_invisible(cp: int) -> bool:
    return (
        0x200B <= cp <= 0x200F
        or 0x202A <= cp <= 0x202E
        or 0x2060 <= cp <= 0x2064
        or 0x2066 <= cp <= 0x2069
        or cp == 0xFEFF
    )


def make_evidence(line: str) -> str:
    """Strip, truncate to 300 chars, escape invisible and control characters, and truncate to 300 chars."""
    stripped = line.strip()
    was_truncated = len(stripped) > 300
    sample = stripped[:300]
    chars: list[str] = []
    for c in sample:
        cp = ord(c)
        if cp == 0x09:  # Preserve tab
            chars.append(c)
        elif cp < 0x20 or (0x7F <= cp <= 0x9F) or _is_invisible(cp):
            chars.append(f"\\u{cp:04X}")
        else:
            chars.append(c)
    text = "".join(chars)
    if was_truncated or len(text) > 300:
        return text[:299] + "…"
    return text


__all__ = ["Finding", "Severity", "make_evidence"]
