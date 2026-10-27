"""Archive unpacking and snapshot generation for skill auditor worker."""

import gzip
import tarfile
from typing import BinaryIO

from auditor_worker.errors import AnalysisFailure, TransientError
from auditor_worker.limits import (
    MAX_FILE_BYTES,
    MAX_FILES,
    MAX_TOTAL_BYTES,
    MAX_UNCOMPRESSED_BYTES,
)
from auditor_worker.snapshot import Snapshot, TreeEntry, git_blob_sha


class _CountingReader:
    """Reader that tracks decompressed bytes and enforces an uncompressed size limit."""

    def __init__(self, raw: BinaryIO, max_bytes: int) -> None:
        self._raw = raw
        self._max_bytes = max_bytes
        self._bytes_read = 0

    def read(self, size: int = -1) -> bytes:
        chunk = self._raw.read(size)
        self._bytes_read += len(chunk)
        if self._bytes_read > self._max_bytes:
            raise AnalysisFailure("El repositorio es demasiado grande para analizarlo")
        return chunk


def read_snapshot(
    stream: BinaryIO,
    source_files: list[TreeEntry],
    skill_path: str,
    *,
    max_uncompressed: int = MAX_UNCOMPRESSED_BYTES,
    max_file_bytes: int = MAX_FILE_BYTES,
    max_files: int = MAX_FILES,
    max_total_bytes: int = MAX_TOTAL_BYTES,
) -> Snapshot:
    """Read a repository tarball stream and construct a safe in-memory Snapshot.

    Validates that the downloaded archive matches source_files entries exactly,
    enforcing file counts, file sizes, decompression limits, and SHA-1 blob integrity.
    """
    blobs: list[TreeEntry] = []
    submodules: list[str] = []
    expected_by_path: dict[str, TreeEntry] = {}

    for entry in source_files:
        if entry.type == "tree":
            continue
        if entry.type == "commit":
            submodules.append(entry.path)
            continue
        blobs.append(entry)
        expected_by_path[entry.path] = entry

    # Verify limits against source_files prior to reading archive
    if len(blobs) > max_files:
        raise AnalysisFailure(f"La skill supera el límite de {max_files} archivos")

    total_bytes = sum(entry.size for entry in blobs if entry.size is not None)
    if total_bytes > max_total_bytes:
        raise AnalysisFailure(f"La skill supera el límite de {max_total_bytes} bytes en total")

    for entry in blobs:
        if entry.size is not None and entry.size > max_file_bytes:
            raise AnalysisFailure(f"El archivo {entry.path} supera el límite de {max_file_bytes} bytes")

    clean_skill_path = skill_path.strip("/")
    candidate_readmes: set[str] = {"README.md"}
    if clean_skill_path and clean_skill_path != ".":
        candidate_readmes.add(f"{clean_skill_path}/README.md")

    files: dict[str, bytes] = {}
    symlinks: dict[str, str] = {}
    readmes: dict[str, bytes] = {}
    seen_expected: set[str] = set()

    try:
        gz = gzip.GzipFile(fileobj=stream, mode="rb")
        counting_reader = _CountingReader(gz, max_uncompressed)
        with tarfile.open(fileobj=counting_reader, mode="r|") as tar:
            for member in tar:
                parts = member.name.split("/")
                if len(parts) <= 1:
                    continue
                rel_path = "/".join(parts[1:]).rstrip("/")
                if not rel_path:
                    continue

                is_expected = rel_path in expected_by_path
                is_readme_candidate = rel_path in candidate_readmes

                if not is_expected and not is_readme_candidate:
                    continue

                if is_readme_candidate and not is_expected:
                    if member.isreg():
                        if member.size > max_file_bytes:
                            raise AnalysisFailure(f"El archivo {rel_path} supera el límite de {max_file_bytes} bytes")
                        f = tar.extractfile(member)
                        if f is None:
                            continue
                        content = f.read(max_file_bytes + 1)
                        if len(content) > max_file_bytes:
                            raise AnalysisFailure(f"El archivo {rel_path} supera el límite de {max_file_bytes} bytes")
                        readmes[rel_path] = content
                    continue

                if rel_path in seen_expected:
                    raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")
                seen_expected.add(rel_path)

                expected = expected_by_path[rel_path]

                if expected.mode == "120000":
                    if not member.issym():
                        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")
                    target = member.linkname
                    if git_blob_sha(target.encode("utf-8")) != expected.sha:
                        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")
                    symlinks[rel_path] = target
                else:
                    if not member.isreg() or member.islnk() or member.isdir():
                        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")
                    if expected.size is not None and member.size != expected.size:
                        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")
                    if member.size > max_file_bytes:
                        raise AnalysisFailure(f"El archivo {rel_path} supera el límite de {max_file_bytes} bytes")

                    f = tar.extractfile(member)
                    if f is None:
                        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")
                    data = f.read(max_file_bytes + 1)
                    if len(data) > max_file_bytes:
                        raise AnalysisFailure(f"El archivo {rel_path} supera el límite de {max_file_bytes} bytes")
                    if expected.size is not None and len(data) != expected.size:
                        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")
                    if git_blob_sha(data) != expected.sha:
                        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")

                    files[rel_path] = data
                    if is_readme_candidate:
                        readmes[rel_path] = data

        if len(seen_expected) != len(expected_by_path):
            raise AnalysisFailure("El contenido descargado no coincide con el commit analizado")

    except AnalysisFailure, TransientError:
        raise
    except (tarfile.TarError, OSError, EOFError) as err:
        raise AnalysisFailure("El contenido descargado no coincide con el commit analizado") from err

    return Snapshot(
        files=files,
        symlinks=symlinks,
        submodules=submodules,
        readmes=readmes,
    )


__all__ = ["read_snapshot"]
