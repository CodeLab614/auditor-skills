"""Tests for archive reading, decompression protection, and snapshot creation."""

import io
import os
import tarfile

import pytest

from auditor_worker.archive import read_snapshot
from auditor_worker.errors import AnalysisFailure
from auditor_worker.snapshot import TreeEntry, git_blob_sha


def make_tarball(
    files: dict[str, bytes] | None = None,
    symlinks: dict[str, str] | None = None,
    hardlinks: dict[str, str] | None = None,
    prefix: str = "owner-repo-abc1234",
) -> io.BytesIO:
    """Helper to construct in-memory gzipped tar archives matching GitHub tarball layout."""
    bio = io.BytesIO()
    with tarfile.open(fileobj=bio, mode="w:gz") as tar:
        if files:
            for name, data in files.items():
                ti = tarfile.TarInfo(name=f"{prefix}/{name}")
                ti.size = len(data)
                ti.type = tarfile.REGTYPE
                ti.mode = 0o644
                tar.addfile(ti, io.BytesIO(data))
        if symlinks:
            for name, target in symlinks.items():
                ti = tarfile.TarInfo(name=f"{prefix}/{name}")
                ti.type = tarfile.SYMTYPE
                ti.linkname = target
                ti.mode = 0o777
                tar.addfile(ti)
        if hardlinks:
            for name, target in hardlinks.items():
                ti = tarfile.TarInfo(name=f"{prefix}/{name}")
                ti.type = tarfile.LNKTYPE
                ti.linkname = f"{prefix}/{target}"
                ti.mode = 0o644
                tar.addfile(ti)
    bio.seek(0)
    return bio


def test_git_blob_sha_matches_git() -> None:
    """git_blob_sha must produce exact git object SHA-1 hashes."""
    assert git_blob_sha(b"hello\n") == "ce013625030ba8dba906f756967f9e9ca394464a"
    assert git_blob_sha(b"") == "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"


def test_snapshot_reads_expected_files_and_skips_the_rest() -> None:
    """read_snapshot extracts expected files, handles submodules, and ignores untracked files."""
    file1_data = b"# Test Skill\nDescription here."
    file2_data = b"print('running script')"
    ignored_data = b"unrelated repo file"

    tar_stream = make_tarball(
        files={
            "SKILL.md": file1_data,
            "scripts/run.py": file2_data,
            "other/ignored.txt": ignored_data,
        }
    )

    source_files = [
        TreeEntry(
            path="SKILL.md",
            type="blob",
            sha=git_blob_sha(file1_data),
            size=len(file1_data),
            mode="100644",
        ),
        TreeEntry(
            path="scripts/run.py",
            type="blob",
            sha=git_blob_sha(file2_data),
            size=len(file2_data),
            mode="100644",
        ),
        TreeEntry(
            path="vendor/submodule",
            type="commit",
            sha="abcdef0123456789abcdef0123456789abcdef01",
            size=None,
            mode="160000",
        ),
        TreeEntry(
            path="ignored_dir",
            type="tree",
            sha="0000000000000000000000000000000000000000",
            size=None,
            mode="040000",
        ),
    ]

    snapshot = read_snapshot(tar_stream, source_files, "")

    assert snapshot.files["SKILL.md"] == file1_data
    assert snapshot.files["scripts/run.py"] == file2_data
    assert "other/ignored.txt" not in snapshot.files
    assert snapshot.submodules == ["vendor/submodule"]
    assert snapshot.symlinks == {}


def test_sha_mismatch_fails() -> None:
    """A file in the archive whose SHA does not match source_files triggers AnalysisFailure."""
    original = b"content_a"
    tampered = b"content_b"

    tar_stream = make_tarball(files={"SKILL.md": tampered})
    source_files = [
        TreeEntry(
            path="SKILL.md",
            type="blob",
            sha=git_blob_sha(original),
            size=len(original),
            mode="100644",
        )
    ]

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(tar_stream, source_files, "")

    assert "El contenido descargado no coincide con el commit analizado" in str(exc_info.value)


def test_size_larger_than_tree_fails() -> None:
    """A file in the archive whose size differs from the tree metadata triggers AnalysisFailure."""
    data = b"0123456789extra_bytes"
    tar_stream = make_tarball(files={"data.bin": data})
    source_files = [
        TreeEntry(
            path="data.bin",
            type="blob",
            sha=git_blob_sha(data),
            size=10,
            mode="100644",
        )
    ]

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(tar_stream, source_files, "")

    assert "El contenido descargado no coincide con el commit analizado" in str(exc_info.value)


def test_symlink_where_file_expected_fails() -> None:
    """An archive entry that is a symlink when mode 100644 is expected triggers AnalysisFailure."""
    tar_stream = make_tarball(symlinks={"SKILL.md": "target.md"})
    source_files = [
        TreeEntry(
            path="SKILL.md",
            type="blob",
            sha=git_blob_sha(b"target.md"),
            size=len("target.md"),
            mode="100644",
        )
    ]

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(tar_stream, source_files, "")

    assert "El contenido descargado no coincide con el commit analizado" in str(exc_info.value)


def test_hardlink_where_file_expected_fails() -> None:
    """An archive entry that is a hardlink triggers AnalysisFailure when regular file is expected."""
    file_data = b"original"
    tar_stream = make_tarball(
        files={"real.txt": file_data},
        hardlinks={"SKILL.md": "real.txt"},
    )
    source_files = [
        TreeEntry(
            path="SKILL.md",
            type="blob",
            sha=git_blob_sha(file_data),
            size=len(file_data),
            mode="100644",
        )
    ]

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(tar_stream, source_files, "")

    assert "El contenido descargado no coincide con el commit analizado" in str(exc_info.value)


def test_symlink_target_is_recorded_not_followed() -> None:
    """Symlink target is safely recorded as a string in snapshot.symlinks without following."""
    target_path = "../../etc/passwd"
    target_bytes = target_path.encode("utf-8")

    tar_stream = make_tarball(symlinks={"link_file": target_path})
    source_files = [
        TreeEntry(
            path="link_file",
            type="blob",
            sha=git_blob_sha(target_bytes),
            size=len(target_bytes),
            mode="120000",
        )
    ]

    snapshot = read_snapshot(tar_stream, source_files, "")
    assert snapshot.symlinks["link_file"] == target_path
    assert "link_file" not in snapshot.files


def test_decompression_limit() -> None:
    """Decompressing beyond max_uncompressed raises AnalysisFailure."""
    data = b"\0" * (2 * 1024 * 1024)  # 2 MB of zeros
    tar_stream = make_tarball(files={"large.bin": data})
    source_files = [
        TreeEntry(
            path="large.bin",
            type="blob",
            sha=git_blob_sha(data),
            size=len(data),
            mode="100644",
        )
    ]

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(
            tar_stream,
            source_files,
            "",
            max_uncompressed=1024 * 1024,
            max_file_bytes=5 * 1024 * 1024,
            max_total_bytes=5 * 1024 * 1024,
        )

    assert "El repositorio es demasiado grande para analizarlo" in str(exc_info.value)


def test_decompression_limit_on_skipped_member() -> None:
    """Skipping a large uninteresting member still enforces max_uncompressed limit and stops early."""
    prefix = "owner-repo-abc1234"
    bio = io.BytesIO()
    with tarfile.open(fileobj=bio, mode="w:gz", compresslevel=1) as tar:
        # First file: NOT in source_files, 8 MB of incompressible data
        random_data = os.urandom(8 * 1024 * 1024)
        ti1 = tarfile.TarInfo(name=f"{prefix}/ignored_large.bin")
        ti1.size = len(random_data)
        ti1.type = tarfile.REGTYPE
        ti1.mode = 0o644
        tar.addfile(ti1, io.BytesIO(random_data))

        # Second file: SKILL.md which IS in source_files
        skill_data = b"# Test Skill\n"
        ti2 = tarfile.TarInfo(name=f"{prefix}/SKILL.md")
        ti2.size = len(skill_data)
        ti2.type = tarfile.REGTYPE
        ti2.mode = 0o644
        tar.addfile(ti2, io.BytesIO(skill_data))

    compressed = bio.getvalue()
    source = io.BytesIO(compressed)

    source_files = [
        TreeEntry(
            path="SKILL.md",
            type="blob",
            sha=git_blob_sha(skill_data),
            size=len(skill_data),
            mode="100644",
        )
    ]

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(
            source,
            source_files,
            "",
            max_uncompressed=1024 * 1024,
        )

    assert "El repositorio es demasiado grande para analizarlo" in str(exc_info.value)
    assert source.tell() < len(compressed) // 2


def test_too_many_files_fails_before_reading() -> None:
    """Exceeding max_files in source_files raises AnalysisFailure before touching the stream."""
    source_files = [
        TreeEntry(path="a.txt", type="blob", sha="1111", size=10, mode="100644"),
        TreeEntry(path="b.txt", type="blob", sha="2222", size=10, mode="100644"),
        TreeEntry(path="c.txt", type="blob", sha="3333", size=10, mode="100644"),
    ]
    # Passing an invalid stream proves that the archive stream is never touched
    invalid_stream = io.BytesIO(b"not_a_valid_tarball")

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(invalid_stream, source_files, "", max_files=2)

    assert "archivos" in str(exc_info.value)


def test_total_size_fails_before_reading() -> None:
    """Exceeding max_total_bytes in source_files raises AnalysisFailure before touching the stream."""
    source_files = [
        TreeEntry(path="a.txt", type="blob", sha="1111", size=600, mode="100644"),
        TreeEntry(path="b.txt", type="blob", sha="2222", size=500, mode="100644"),
    ]
    invalid_stream = io.BytesIO(b"not_a_valid_tarball")

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(invalid_stream, source_files, "", max_total_bytes=1000)

    assert "bytes en total" in str(exc_info.value)


def test_file_size_fails_before_reading() -> None:
    """A file in source_files exceeding max_file_bytes raises AnalysisFailure before reading."""
    source_files = [
        TreeEntry(path="big.txt", type="blob", sha="1111", size=2000, mode="100644"),
    ]
    invalid_stream = io.BytesIO(b"not_a_valid_tarball")

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(invalid_stream, source_files, "", max_file_bytes=1000)

    assert "big.txt" in str(exc_info.value)
    assert "supera el límite" in str(exc_info.value)


def test_readme_is_read_without_tree_check() -> None:
    """Root and skill-path README.md are read and included in readmes without tree matching."""
    root_readme = b"# Root Project Readme"
    skill_readme = b"# Skill Specific Readme"
    skill_code = b"---\nname: my-skill\n---"

    tar_stream = make_tarball(
        files={
            "README.md": root_readme,
            "skills/my-skill/README.md": skill_readme,
            "skills/my-skill/SKILL.md": skill_code,
        }
    )

    source_files = [
        TreeEntry(
            path="skills/my-skill/SKILL.md",
            type="blob",
            sha=git_blob_sha(skill_code),
            size=len(skill_code),
            mode="100644",
        )
    ]

    snapshot = read_snapshot(tar_stream, source_files, "skills/my-skill")

    assert snapshot.readmes["README.md"] == root_readme
    assert snapshot.readmes["skills/my-skill/README.md"] == skill_readme
    assert "README.md" not in snapshot.files
    assert "skills/my-skill/README.md" not in snapshot.files
    assert snapshot.files["skills/my-skill/SKILL.md"] == skill_code


def test_missing_expected_file_fails() -> None:
    """If an expected file from source_files is missing from the tarball, it raises AnalysisFailure."""
    tar_stream = make_tarball(files={"SKILL.md": b"test"})
    source_files = [
        TreeEntry(
            path="SKILL.md",
            type="blob",
            sha=git_blob_sha(b"test"),
            size=4,
            mode="100644",
        ),
        TreeEntry(
            path="missing.txt",
            type="blob",
            sha=git_blob_sha(b"missing"),
            size=7,
            mode="100644",
        ),
    ]

    with pytest.raises(AnalysisFailure) as exc_info:
        read_snapshot(tar_stream, source_files, "")

    assert "El contenido descargado no coincide con el commit analizado" in str(exc_info.value)
