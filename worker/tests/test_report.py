"""Tests for analysis JSON report generation."""

from auditor_worker.dependencies import Dependency
from auditor_worker.findings import Finding
from auditor_worker.installation import InstallStep
from auditor_worker.inventory import InventoryItem
from auditor_worker.osv import OsvResult
from auditor_worker.remote import RemoteScript
from auditor_worker.report import build_report


def test_report_shape_and_schema_version() -> None:
    """build_report produces schemaVersion 1 with all required top-level keys."""
    steps = [
        InstallStep(
            method="folder",
            command="npx skills add owner/repo --skill my-skill",
            touches="Copia la carpeta",
            source=None,
            matches_declared=True,
        )
    ]
    deps = [
        Dependency(
            ecosystem="PyPI",
            name="requests",
            version="2.31.0",
            pinned=True,
            file_path="requirements.txt",
            line=1,
            source="manifest",
        )
    ]
    items = [
        InventoryItem(
            path="main.py",
            blob_sha="sha1",
            byte_size=120,
            kind="code",
            language="python",
            line_count=10,
            flags=[],
        )
    ]
    remotes: list[RemoteScript] = []
    top_finding = Finding(
        rule_id="net.http",
        category="network",
        severity_undeclared="high",
        severity_declared="medium",
        file_path="main.py",
        line=5,
        title="Petición HTTP",
        evidence="https://api.example.com",
    )
    osv_res = OsvResult(advisories={}, available=True)
    cov = {"sourceBytes": 120, "decompiledBytes": 0, "unreviewableBytes": 0}

    report = build_report(
        install_steps_list=steps,
        dependencies_list=deps,
        items=items,
        remotes=remotes,
        top_finding=top_finding,
        osv_result=osv_res,
        invalid_manifests=[],
        submodules=[],
        coverage_dict=cov,
        suppressed=3,
    )

    assert report["schemaVersion"] == 1
    assert "install" in report
    assert "dependencies" in report
    assert "notExecuted" in report
    assert "notVerifiable" in report
    assert "steps" in report
    assert "coverage" in report
    assert report["topFindingKey"] == "net.http:main.py:5"
    assert report["suppressed"] == 3

    # Check install item keys
    inst_item = report["install"][0]
    assert inst_item == {
        "method": "folder",
        "command": "npx skills add owner/repo --skill my-skill",
        "touches": "Copia la carpeta",
        "source": None,
        "matchesDeclared": True,
    }

    # Check dependencies item keys
    dep_item = report["dependencies"][0]
    assert dep_item == {
        "ecosystem": "PyPI",
        "name": "requests",
        "version": "2.31.0",
        "pinned": True,
        "filePath": "requirements.txt",
        "line": 1,
        "source": "manifest",
    }


def test_not_verifiable_messages() -> None:
    """notVerifiable messages appear in exact order and only when applicable."""
    deps = [
        Dependency("PyPI", "pkg-a", "1.0", True, "reqs.txt", 1, "manifest"),
        Dependency("npm", "pkg-b", "2.0", True, "package.json", 1, "manifest"),
    ]
    osv_res = OsvResult(advisories={}, available=False)
    invalid_manifests = ["broken/requirements.txt"]
    submodules = ["sub/vendor"]
    remotes = [
        RemoteScript("https://fail.example/x.sh", None, None, None, "DNS timeout"),
        RemoteScript("https://ok.example/y.sh", b"echo hi\n", "sha256", None, None),
    ]

    report = build_report(
        install_steps_list=[],
        dependencies_list=deps,
        items=[],
        remotes=remotes,
        top_finding=None,
        osv_result=osv_res,
        invalid_manifests=invalid_manifests,
        submodules=submodules,
        coverage_dict={"sourceBytes": 0, "decompiledBytes": 0, "unreviewableBytes": 0},
        suppressed=0,
    )

    expected = [
        (
            "No se revisó el código de los 2 paquetes de terceros que instala; "
            "solo se buscaron en la lista de problemas conocidos (OSV)."
        ),
        "No se pudo consultar OSV: no se sabe si los paquetes tienen problemas conocidos.",
        "Manifiesto broken/requirements.txt: no se pudo leer.",
        "Submódulo sub/vendor: no se analizó.",
        "Script remoto https://fail.example/x.sh: DNS timeout",
        "Que un script remoto haya cambiado desde el análisis.",
    ]

    assert report["notVerifiable"] == expected


def test_steps_labels() -> None:
    """steps section includes exact Spanish labels and correct counters."""
    items = [
        InventoryItem("run.py", "s1", 100, "code", "python", 5, []),
        InventoryItem("helper.js", "s2", 150, "code", "js", 8, []),
        InventoryItem("bin.dat", "s3", 500, "binary", None, 0, ["binary"]),
    ]
    remotes = [
        RemoteScript("https://example.com/ok.sh", b"echo hi\n", "sha", None, None),
    ]

    report = build_report(
        install_steps_list=[],
        dependencies_list=[],
        items=items,
        remotes=remotes,
        top_finding=None,
        osv_result=OsvResult(advisories={}, available=True),
        invalid_manifests=[],
        submodules=[],
        coverage_dict={"sourceBytes": 258, "decompiledBytes": 0, "unreviewableBytes": 500},
        suppressed=0,
    )

    steps = report["steps"]
    labels = [s["label"] for s in steps]
    assert labels == ["Reglas", "Explicación por IA", "Descompilación", "Ejecución aislada"]

    # Text files = 2 items + 1 remote = 3
    assert steps[0] == {"label": "Reglas", "done": 3, "total": 3}
    assert steps[1] == {"label": "Explicación por IA", "done": 0, "total": 3}
    assert steps[2] == {"label": "Descompilación", "done": 0, "total": 1}
    # notExecuted: 2 code files (python, js) + 1 downloaded remote = 3
    assert steps[3] == {"label": "Ejecución aislada", "done": 0, "total": 3}


def test_not_verifiable_singular_package() -> None:
    """Singular message is used when exactly 1 distinct dependency is present."""
    deps = [
        Dependency("PyPI", "requests", "2.31.0", True, "requirements.txt", 1, "manifest"),
    ]
    report = build_report(
        install_steps_list=[],
        dependencies_list=deps,
        items=[],
        remotes=[],
        top_finding=None,
        osv_result=OsvResult(advisories={}, available=True),
        invalid_manifests=[],
        submodules=[],
        coverage_dict={"sourceBytes": 0, "decompiledBytes": 0, "unreviewableBytes": 0},
        suppressed=0,
    )
    expected = [
        (
            "No se revisó el código del paquete de terceros que instala; "
            "solo se buscó en la lista de problemas conocidos (OSV)."
        )
    ]
    assert report["notVerifiable"] == expected
