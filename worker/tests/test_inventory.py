"""Tests for file inventory detection, flags, and classification."""

import base64
import os

from auditor_worker.inventory import inventory
from auditor_worker.snapshot import Snapshot


def _make_snapshot(files: dict[str, bytes]) -> Snapshot:
    return Snapshot(files=files, symlinks={}, submodules=[], readmes={})


def test_python_by_extension() -> None:
    """Python files detected by extension."""
    snapshot = _make_snapshot({"app/main.py": b"def hello():\n    return 'world'\n"})
    items = inventory(snapshot)
    assert len(items) == 1
    item = items[0]
    assert item.path == "app/main.py"
    assert item.kind == "code"
    assert item.language == "python"
    assert item.flags == []


def test_shell_by_shebang_without_extension() -> None:
    """Extensionless script with #!/usr/bin/env bash is identified as shell."""
    snapshot = _make_snapshot({"scripts/run": b"#!/usr/bin/env bash\necho 'running'\n"})
    items = inventory(snapshot)
    assert len(items) == 1
    item = items[0]
    assert item.path == "scripts/run"
    assert item.kind == "code"
    assert item.language == "shell"
    assert item.flags == []


def test_binary_by_nul_byte() -> None:
    """A file containing a NUL byte is classified as binary regardless of extension."""
    data = b"print('hello')\x00extra data"
    snapshot = _make_snapshot({"test.py": data})
    items = inventory(snapshot)
    assert len(items) == 1
    item = items[0]
    assert item.kind == "binary"
    assert item.language is None
    assert item.line_count == 0
    assert "binary" in item.flags


def test_invalid_utf8_is_binary() -> None:
    """Invalid UTF-8 content forces binary classification."""
    data = b"\xff\xfe\xfa\x80\x81 not utf-8"
    snapshot = _make_snapshot({"data.txt": data})
    items = inventory(snapshot)
    assert len(items) == 1
    item = items[0]
    assert item.kind == "binary"
    assert item.language is None
    assert item.line_count == 0
    assert "binary" in item.flags


def test_minified_flag() -> None:
    """Lines exceeding 5000 characters trigger the minified flag."""
    long_line = "var a = 1;" + "x" * 5005
    data = f"{long_line}\nconsole.log(a);\n".encode()
    snapshot = _make_snapshot({"bundle.js": data})
    items = inventory(snapshot)
    assert len(items) == 1
    assert "minified" in items[0].flags


def test_high_entropy_flag() -> None:
    """Base64 of 4096 random bytes triggers high-entropy, while 2 KB Spanish text does not."""
    b64_random = base64.b64encode(os.urandom(4096))
    spanish_paragraph = (
        "El auditor de habilidades analiza scripts de agentes para verificar su seguridad y comportamiento. "
        "Las reglas deterministas detectan patrones sospechosos en el código fuente de manera rigurosa. "
    )
    # Ensure Spanish text is > 1024 bytes (around 2 KB)
    spanish_text = (spanish_paragraph * 10).encode("utf-8")
    assert len(b64_random) > 1024
    assert len(spanish_text) > 1024

    snapshot = _make_snapshot(
        {
            "random.b64": b64_random,
            "document.es.txt": spanish_text,
        }
    )
    items = inventory(snapshot)
    assert len(items) == 2
    random_item = next(it for it in items if it.path == "random.b64")
    spanish_item = next(it for it in items if it.path == "document.es.txt")

    assert "high-entropy" in random_item.flags
    assert "high-entropy" not in spanish_item.flags


def test_line_count() -> None:
    """Empty string gives 0 lines, and 'a\\nb' gives 2 lines."""
    snapshot = _make_snapshot(
        {
            "empty.txt": b"",
            "two_lines.txt": b"a\nb",
            "three_lines.txt": b"first\nsecond\nthird\n",
        }
    )
    items = inventory(snapshot)
    items_by_path = {it.path: it.line_count for it in items}

    assert items_by_path["empty.txt"] == 0
    assert items_by_path["two_lines.txt"] == 2
    assert items_by_path["three_lines.txt"] == 3
