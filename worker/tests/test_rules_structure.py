"""Tests for structure rules: struct.symlink-outside, struct.submodule, and struct.binary."""

from auditor_worker.inventory import InventoryItem
from auditor_worker.rules.structure import scan_structure
from auditor_worker.snapshot import Snapshot


def test_symlink_outside_skill_folder() -> None:
    """A symlink whose resolved path escapes the skill folder triggers struct.symlink-outside."""
    snapshot = Snapshot(
        files={},
        symlinks={"skills/scanner/link": "../../etc/passwd"},
        submodules=[],
        readmes={},
    )
    findings = scan_structure(snapshot, items=[], skill_path="skills/scanner")
    sym_findings = [f for f in findings if f.rule_id == "struct.symlink-outside"]
    assert len(sym_findings) == 1
    f = sym_findings[0]
    assert f.file_path == "skills/scanner/link"
    assert f.line == 1
    assert f.severity_undeclared == "high"
    assert f.severity_declared == "high"
    assert f.evidence == "skills/scanner/link → ../../etc/passwd"


def test_symlink_inside_skill_folder_is_ok() -> None:
    """A symlink pointing inside the skill folder does not trigger struct.symlink-outside."""
    snapshot = Snapshot(
        files={},
        symlinks={"skills/scanner/link": "./internal/target.py"},
        submodules=[],
        readmes={},
    )
    findings = scan_structure(snapshot, items=[], skill_path="skills/scanner")
    assert not any(f.rule_id == "struct.symlink-outside" for f in findings)


def test_absolute_symlink_is_outside() -> None:
    """An absolute symlink target is always outside the repository."""
    snapshot = Snapshot(
        files={},
        symlinks={"skills/scanner/link": "/etc/shadow"},
        submodules=[],
        readmes={},
    )
    findings = scan_structure(snapshot, items=[], skill_path="skills/scanner")
    sym_findings = [f for f in findings if f.rule_id == "struct.symlink-outside"]
    assert len(sym_findings) == 1
    assert sym_findings[0].evidence == "skills/scanner/link → /etc/shadow"


def test_submodule_reported() -> None:
    """Git submodules in the snapshot are reported as unanalyzable with medium severity."""
    snapshot = Snapshot(
        files={},
        symlinks={},
        submodules=["vendor/sub-repo"],
        readmes={},
    )
    findings = scan_structure(snapshot, items=[], skill_path="skills/scanner")
    sub_findings = [f for f in findings if f.rule_id == "struct.submodule"]
    assert len(sub_findings) == 1
    f = sub_findings[0]
    assert f.file_path == "vendor/sub-repo"
    assert f.line == 1
    assert f.severity_undeclared == "medium"
    assert f.severity_declared == "medium"
    assert f.evidence == "Submódulo git: vendor/sub-repo"


def test_binary_reported_with_basename_token() -> None:
    """Binary inventory items are reported with basename token and line 1."""
    item = InventoryItem(
        path="skills/scanner/bin/helper.exe",
        blob_sha="deadbeef",
        byte_size=1024,
        kind="binary",
        language=None,
        line_count=0,
        flags=["binary"],
    )
    snapshot = Snapshot(files={}, symlinks={}, submodules=[], readmes={})
    findings = scan_structure(snapshot, items=[item], skill_path="skills/scanner")
    bin_findings = [f for f in findings if f.rule_id == "struct.binary"]
    assert len(bin_findings) == 1
    f = bin_findings[0]
    assert f.file_path == "skills/scanner/bin/helper.exe"
    assert f.token == "helper.exe"
    assert f.line == 1
    assert f.severity_undeclared == "high"
    assert f.severity_declared == "medium"
    assert f.evidence == "Archivo binario: helper.exe"
