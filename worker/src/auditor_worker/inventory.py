"""File inventory and type detection for snapshots."""

import math
import os
from collections import Counter
from dataclasses import dataclass

from auditor_worker.snapshot import Snapshot, git_blob_sha

EXTENSION_MAP: dict[str, tuple[str, str | None]] = {
    # python
    ".py": ("code", "python"),
    # js
    ".js": ("code", "js"),
    ".mjs": ("code", "js"),
    ".cjs": ("code", "js"),
    ".jsx": ("code", "js"),
    ".ts": ("code", "js"),
    ".tsx": ("code", "js"),
    ".mts": ("code", "js"),
    ".cts": ("code", "js"),
    # shell
    ".sh": ("code", "shell"),
    ".bash": ("code", "shell"),
    ".zsh": ("code", "shell"),
    # powershell
    ".ps1": ("code", "powershell"),
    ".psm1": ("code", "powershell"),
    # markdown
    ".md": ("markdown", "markdown"),
    ".mdx": ("markdown", "markdown"),
    ".markdown": ("markdown", "markdown"),
    # config
    ".json": ("config", "config"),
    ".jsonc": ("config", "config"),
    ".toml": ("config", "config"),
    ".yaml": ("config", "config"),
    ".yml": ("config", "config"),
    ".ini": ("config", "config"),
    ".cfg": ("config", "config"),
    ".conf": ("config", "config"),
    # image
    ".png": ("image", None),
    ".jpg": ("image", None),
    ".jpeg": ("image", None),
    ".gif": ("image", None),
    ".webp": ("image", None),
    ".ico": ("image", None),
    ".svg": ("image", None),
}


@dataclass
class InventoryItem:
    """An analyzed file entry within the snapshot inventory."""

    path: str
    blob_sha: str
    byte_size: int
    kind: str
    language: str | None
    line_count: int
    flags: list[str]


def _shannon_entropy(data: bytes) -> float:
    """Calculate Shannon entropy per byte in bits."""
    if not data:
        return 0.0
    counts = Counter(data)
    total = len(data)
    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log2(p)
    return entropy


def _detect_shebang(first_line: str) -> tuple[str, str | None] | None:
    """Detect file kind and language from a shebang line."""
    if not first_line.startswith("#!"):
        return None
    content = first_line[2:].strip()
    if not content:
        return None
    parts = content.split()
    if not parts:
        return None
    cmd_part = parts[0]
    if cmd_part.endswith("/env") or cmd_part == "env":
        target = None
        for p in parts[1:]:
            if not p.startswith("-"):
                target = p
                break
        if not target:
            return None
        cmd = target.rsplit("/", 1)[-1]
    else:
        cmd = cmd_part.rsplit("/", 1)[-1]

    if cmd in {"sh", "bash", "zsh", "dash", "ksh"}:
        return ("code", "shell")
    if cmd in {"python", "python3"}:
        return ("code", "python")
    if cmd in {"node", "deno", "bun"}:
        return ("code", "js")
    return None


def inventory(snapshot: Snapshot) -> list[InventoryItem]:
    """Build an inventory of all files in the snapshot sorted by path."""
    items: list[InventoryItem] = []

    for path, data in sorted(snapshot.files.items(), key=lambda item: item[0]):
        blob_sha = git_blob_sha(data)
        byte_size = len(data)

        # Check binary first: NUL byte in first 8192 bytes or invalid UTF-8
        is_binary = b"\0" in data[:8192]
        text: str | None = None
        if not is_binary:
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                is_binary = True

        if is_binary:
            items.append(
                InventoryItem(
                    path=path,
                    blob_sha=blob_sha,
                    byte_size=byte_size,
                    kind="binary",
                    language=None,
                    line_count=0,
                    flags=["binary"],
                )
            )
            continue

        # Valid text file
        if text is None:
            raise ValueError("internal error: text missing for non-binary file")
        ext = os.path.splitext(path)[1].lower()

        if ext in EXTENSION_MAP:
            kind, language = EXTENSION_MAP[ext]
        else:
            first_line = text.split("\n", 1)[0].strip()
            shebang_res = _detect_shebang(first_line)
            if shebang_res is not None:
                kind, language = shebang_res
            else:
                kind, language = ("other", None)

        line_count = len(text.splitlines()) if text else 0
        flags: list[str] = []

        if any(len(line) > 5000 for line in text.splitlines()):
            flags.append("minified")

        if len(data) > 1024 and _shannon_entropy(data) > 5.5:
            flags.append("high-entropy")

        items.append(
            InventoryItem(
                path=path,
                blob_sha=blob_sha,
                byte_size=byte_size,
                kind=kind,
                language=language,
                line_count=line_count,
                flags=flags,
            )
        )

    return items


__all__ = ["InventoryItem", "inventory"]
