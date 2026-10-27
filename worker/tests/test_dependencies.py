"""Tests for dependency parsing from manifests and installation findings."""

from auditor_worker.dependencies import parse_dependencies
from auditor_worker.findings import Finding
from auditor_worker.snapshot import Snapshot


def test_requirements_pinning() -> None:
    """foo==1.0.0 is pinned and bar>=2 is unpinned."""
    content = b"foo==1.0.0\nbar>=2\n"
    snapshot = Snapshot(files={"requirements.txt": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert invalid == []
    assert len(deps) == 2

    assert deps[0].name == "foo"
    assert deps[0].version == "1.0.0"
    assert deps[0].pinned is True
    assert deps[0].ecosystem == "PyPI"
    assert deps[0].source == "manifest"
    assert deps[0].file_path == "requirements.txt"
    assert deps[0].line == 1

    assert deps[1].name == "bar"
    assert deps[1].version is None
    assert deps[1].pinned is False
    assert deps[1].ecosystem == "PyPI"
    assert deps[1].source == "manifest"
    assert deps[1].file_path == "requirements.txt"
    assert deps[1].line == 2


def test_requirements_extras_markers_comments() -> None:
    """foo[x]==1.2.3; python_version<'3.13' # c parses as foo and 1.2.3."""
    content = b'foo[x]==1.2.3; python_version<"3.13"  # comment\n'
    snapshot = Snapshot(files={"requirements.txt": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert invalid == []
    assert len(deps) == 1
    assert deps[0].name == "foo"
    assert deps[0].version == "1.2.3"
    assert deps[0].pinned is True
    assert deps[0].file_path == "requirements.txt"
    assert deps[0].line == 1


def test_requirements_options_ignored() -> None:
    """Requirements file options starting with - and comments are ignored."""
    content = b"-r other.txt\n-e .\n--index-url https://example.com/simple\n# comment line\n\nfoo==1.0.0\n"
    snapshot = Snapshot(files={"requirements.txt": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert invalid == []
    assert len(deps) == 1
    assert deps[0].name == "foo"
    assert deps[0].version == "1.0.0"
    assert deps[0].line == 6


def test_pyproject_project_and_groups() -> None:
    """pyproject.toml extracts dependencies from project and groups with correct lines."""
    content = (
        b"[project]\n"
        b"dependencies = [\n"
        b'    "foo==1.0.0",\n'
        b"]\n"
        b"\n"
        b"[project.optional-dependencies]\n"
        b"test = [\n"
        b'    "pytest==8.0.0",\n'
        b"]\n"
        b"\n"
        b"[dependency-groups]\n"
        b"dev = [\n"
        b'    "black==24.1.0",\n'
        b"]\n"
    )
    snapshot = Snapshot(files={"pyproject.toml": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert invalid == []
    assert len(deps) == 3

    names = {d.name: d for d in deps}
    assert "foo" in names
    assert names["foo"].version == "1.0.0"
    assert names["foo"].pinned is True
    assert names["foo"].line == 3

    assert "pytest" in names
    assert names["pytest"].version == "8.0.0"
    assert names["pytest"].pinned is True
    assert names["pytest"].line == 8

    assert "black" in names
    assert names["black"].version == "24.1.0"
    assert names["black"].pinned is True
    assert names["black"].line == 13


def test_pyproject_include_group_ignored() -> None:
    """Entries in dependency-groups that are not strings are ignored."""
    content = b'[dependency-groups]\ndev = [\n    "black==24.1.0",\n    {include-group = "test"},\n]\n'
    snapshot = Snapshot(files={"pyproject.toml": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert invalid == []
    assert len(deps) == 1
    assert deps[0].name == "black"
    assert deps[0].version == "24.1.0"
    assert deps[0].pinned is True


def test_package_json_range_is_unpinned() -> None:
    """Caret, tilde, and wildcard version specs in package.json are unpinned."""
    content = (
        b'{\n  "dependencies": {\n    "express": "^4.18.2",\n    "lodash": "~4.17.21",\n    "axios": "*"\n  }\n}\n'
    )
    snapshot = Snapshot(files={"package.json": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert invalid == []
    assert len(deps) == 3
    for dep in deps:
        assert dep.ecosystem == "npm"
        assert dep.pinned is False
        assert dep.version is None


def test_package_json_exact_and_prerelease() -> None:
    """Exact semver and prereleases in package.json are pinned."""
    content = b'{\n  "dependencies": {\n    "express": "4.18.2",\n    "next": "16.0.0-canary.1"\n  }\n}\n'
    snapshot = Snapshot(files={"package.json": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert invalid == []
    assert len(deps) == 2

    by_name = {d.name: d for d in deps}
    assert by_name["express"].pinned is True
    assert by_name["express"].version == "4.18.2"

    assert by_name["next"].pinned is True
    assert by_name["next"].version == "16.0.0-canary.1"


def test_invalid_manifest_listed_not_raised() -> None:
    """Broken package.json is recorded in invalid manifests list without raising an exception."""
    content = b'{\n  "dependencies": broken\n'
    snapshot = Snapshot(files={"package.json": content}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, [])

    assert deps == []
    assert invalid == ["package.json"]


def test_install_findings_become_dependencies() -> None:
    """Package findings with token and ecosystem are converted to install dependencies."""
    findings = [
        Finding(
            rule_id="install.package",
            category="install",
            severity_undeclared="high",
            severity_declared="low",
            file_path="setup.sh",
            line=10,
            title="Instalación del paquete requests",
            evidence="pip install requests==2.31.0",
            token="requests",
            version="2.31.0",
            ecosystem="PyPI",
        ),
        Finding(
            rule_id="install.package",
            category="install",
            severity_undeclared="high",
            severity_declared="low",
            file_path="setup.sh",
            line=12,
            title="Instalación del paquete lodash",
            evidence="npm install lodash",
            token="lodash",
            version=None,
            ecosystem="npm",
        ),
        Finding(
            rule_id="install.package",
            category="install",
            severity_undeclared="high",
            severity_declared="low",
            file_path="setup.sh",
            line=14,
            title="Instalación del paquete jq",
            evidence="brew install jq",
            token="jq",
            version=None,
            ecosystem=None,
        ),
        Finding(
            rule_id="install.package",
            category="install",
            severity_undeclared="high",
            severity_declared="low",
            file_path="setup.sh",
            line=16,
            title="Instalación de paquetes",
            evidence="npm install",
            token=None,
            version=None,
            ecosystem="npm",
        ),
    ]
    snapshot = Snapshot(files={}, symlinks={}, submodules=[], readmes={})
    deps, invalid = parse_dependencies(snapshot, findings)

    assert invalid == []
    assert len(deps) == 2

    assert deps[0].name == "requests"
    assert deps[0].version == "2.31.0"
    assert deps[0].pinned is True
    assert deps[0].ecosystem == "PyPI"
    assert deps[0].source == "install"
    assert deps[0].line == 10

    assert deps[1].name == "lodash"
    assert deps[1].version is None
    assert deps[1].pinned is False
    assert deps[1].ecosystem == "npm"
    assert deps[1].source == "install"
    assert deps[1].line == 12


def test_duplicates_removed() -> None:
    """Duplicate dependencies with identical ecosystem, name, version, path and line are deduplicated."""
    content = b"foo==1.0.0\nfoo==1.0.0\n"
    snapshot = Snapshot(files={"requirements.txt": content}, symlinks={}, submodules=[], readmes={})
    f = Finding(
        rule_id="install.package",
        category="install",
        severity_undeclared="high",
        severity_declared="low",
        file_path="setup.sh",
        line=1,
        title="Instalación del paquete foo",
        evidence="pip install foo==1.0.0",
        token="foo",
        version="1.0.0",
        ecosystem="PyPI",
    )
    deps, invalid = parse_dependencies(snapshot, [f, f])

    assert invalid == []
    # In requirements.txt line 1 has foo and line 2 has foo: they have different lines so 2 deps from requirements
    # From findings, f is repeated twice at line 1, so only 1 remains from findings
    setup_deps = [d for d in deps if d.file_path == "setup.sh"]
    assert len(setup_deps) == 1
    assert setup_deps[0].name == "foo"
    assert setup_deps[0].version == "1.0.0"
