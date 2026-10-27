"""Tests for deterministic version fingerprint matching TypeScript."""

import hashlib

from auditor_worker.fingerprint import final_fingerprint
from auditor_worker.remote import RemoteScript
from auditor_worker.snapshot import TreeEntry


def test_fingerprint_matches_typescript() -> None:
    source_files = [
        TreeEntry(path="SKILL.md", type="blob", sha="a" * 40, size=10, mode="100644"),
        TreeEntry(path="scripts/run.py", type="blob", sha="b" * 40, size=20, mode="100644"),
    ]
    remotes: list[RemoteScript] = []

    digest = final_fingerprint(source_files, remotes)
    assert digest == "9cd639c3800300de6aedea0aa5217934519fa8b4338f7c2ebccf240470929b73"


def test_fingerprint_with_remote() -> None:
    source_files = [
        TreeEntry(path="SKILL.md", type="blob", sha="a" * 40, size=10, mode="100644"),
        TreeEntry(path="scripts/run.py", type="blob", sha="b" * 40, size=20, mode="100644"),
    ]
    remote_sha = hashlib.sha256(b"echo hi\n").hexdigest()
    remotes = [
        RemoteScript(
            url="https://bun.sh/install",
            content=b"echo hi\n",
            sha256=remote_sha,
            downloaded_at=None,
            failure=None,
        )
    ]

    digest = final_fingerprint(source_files, remotes)
    assert digest == "d907488a8d883d94a3206f318e59e94a75895a2770a11d407d181d7a971788b7"


def test_fingerprint_non_ascii_order() -> None:
    source_files = [
        TreeEntry(path="a" + chr(0xFFFF), type="blob", sha="c" * 40, size=5, mode="100644"),
        TreeEntry(path="a\U0001f600", type="blob", sha="d" * 40, size=8, mode="100644"),
    ]
    remotes: list[RemoteScript] = []

    digest = final_fingerprint(source_files, remotes)
    assert digest == "3742bf599de33d798a567e1cb681fe5e7e87cc8af49e7af8ea8a688d8f976f5f"


def test_failed_remote_has_empty_sha() -> None:
    source_files = [
        TreeEntry(path="SKILL.md", type="blob", sha="a" * 40, size=10, mode="100644"),
    ]
    failed_remote = RemoteScript(
        url="https://fail.example.com/bad.sh",
        content=None,
        sha256=None,
        downloaded_at=None,
        failure="Timeout",
    )

    digest = final_fingerprint(source_files, [failed_remote])
    expected_content = f"SKILL.md\0{'a' * 40}\nremote:https://fail.example.com/bad.sh\0\n"
    expected_digest = hashlib.sha256(expected_content.encode("utf-8")).hexdigest()
    assert digest == expected_digest
