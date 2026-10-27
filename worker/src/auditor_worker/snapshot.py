"""Snapshot representations and tree entry definitions."""

import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class TreeEntry:
    path: str
    type: str
    sha: str
    size: int | None
    mode: str


@dataclass(frozen=True)
class Snapshot:
    files: dict[str, bytes]
    symlinks: dict[str, str]
    submodules: list[str]
    readmes: dict[str, bytes]


def git_blob_sha(data: bytes) -> str:
    """Calculate the Git blob SHA-1 hash for the given data."""
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data, usedforsecurity=False).hexdigest()


__all__ = ["Snapshot", "TreeEntry", "git_blob_sha"]
