"""Fingerprint calculation combining repository tree entries and remote scripts."""

import hashlib

from auditor_worker.remote import RemoteScript
from auditor_worker.snapshot import TreeEntry


def final_fingerprint(
    source_files: list[TreeEntry],
    remotes: list[RemoteScript],
) -> str:
    """Calculate the final version fingerprint matching TypeScript filesFingerprint."""
    items: list[tuple[str, str]] = []

    for entry in source_files:
        items.append((entry.path, entry.sha))

    for remote in remotes:
        items.append((f"remote:{remote.url}", remote.sha256 or ""))

    items.sort(key=lambda item: item[0].encode("utf-16-be"))
    lines = "".join(f"{path}\0{sha}\n" for path, sha in items)
    return hashlib.sha256(lines.encode("utf-8")).hexdigest()


__all__ = ["final_fingerprint"]
