"""Dependency parsing from manifests and installation findings."""

import json
import re
import tomllib
from dataclasses import dataclass
from typing import Literal

from auditor_worker.findings import Finding
from auditor_worker.snapshot import Snapshot

PEP508_OP_RE = re.compile(r"(===|==|~=|!=|<=|>=|<|>)")
NPM_PINNED_RE = re.compile(r"^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$")


@dataclass
class Dependency:
    """A project dependency extracted from manifests or installation commands."""

    ecosystem: str
    name: str
    version: str | None
    pinned: bool
    file_path: str
    line: int
    source: Literal["manifest", "install"]


def _parse_pep508_requirement(raw_line: str) -> tuple[str, str | None, bool] | None:
    line = raw_line.split("#", 1)[0].strip()
    if not line or line.startswith("-"):
        return None

    req_part = line.split(";", 1)[0].strip()
    if not req_part:
        return None

    if "@" in req_part:
        name_part = req_part.split("@", 1)[0].strip()
        name = name_part.split("[", 1)[0].strip()
        if not name:
            return None
        return name, None, False

    parts = PEP508_OP_RE.split(req_part, maxsplit=1)
    if len(parts) == 3:
        left, op, right = parts
        name = left.split("[", 1)[0].strip()
        ver_clause = right.strip()
        if not name:
            return None
        if op == "==" and "*" not in ver_clause and "," not in ver_clause and ver_clause != "":
            return name, ver_clause, True
        return name, None, False

    name = req_part.split("[", 1)[0].strip()
    if not name:
        return None
    return name, None, False


def _parse_requirements_file(file_path: str, data: bytes) -> tuple[list[Dependency], bool]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return [], False

    deps: list[Dependency] = []
    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        parsed = _parse_pep508_requirement(raw_line)
        if parsed is not None:
            name, ver, pinned = parsed
            deps.append(
                Dependency(
                    ecosystem="PyPI",
                    name=name,
                    version=ver,
                    pinned=pinned,
                    file_path=file_path,
                    line=line_no,
                    source="manifest",
                )
            )
    return deps, True


def _parse_pyproject_file(file_path: str, data: bytes) -> tuple[list[Dependency], bool]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return [], False

    try:
        doc = tomllib.loads(text)
    except tomllib.TOMLDecodeError, ValueError:
        return [], False

    if not isinstance(doc, dict):
        return [], False

    file_lines = text.splitlines()

    def _find_line(raw_spec: str) -> int:
        for idx, line in enumerate(file_lines, start=1):
            if raw_spec in line:
                return idx
        return 1

    deps: list[Dependency] = []
    project = doc.get("project")
    if project is not None:
        if not isinstance(project, dict):
            return [], False

        deps_list = project.get("dependencies")
        if deps_list is not None:
            if not isinstance(deps_list, list):
                return [], False
            for item in deps_list:
                if not isinstance(item, str):
                    continue
                parsed = _parse_pep508_requirement(item)
                if parsed is not None:
                    name, ver, pinned = parsed
                    deps.append(
                        Dependency(
                            ecosystem="PyPI",
                            name=name,
                            version=ver,
                            pinned=pinned,
                            file_path=file_path,
                            line=_find_line(item),
                            source="manifest",
                        )
                    )

        opt_deps = project.get("optional-dependencies")
        if opt_deps is not None:
            if not isinstance(opt_deps, dict):
                return [], False
            for group_list in opt_deps.values():
                if not isinstance(group_list, list):
                    return [], False
                for item in group_list:
                    if not isinstance(item, str):
                        continue
                    parsed = _parse_pep508_requirement(item)
                    if parsed is not None:
                        name, ver, pinned = parsed
                        deps.append(
                            Dependency(
                                ecosystem="PyPI",
                                name=name,
                                version=ver,
                                pinned=pinned,
                                file_path=file_path,
                                line=_find_line(item),
                                source="manifest",
                            )
                        )

    dep_groups = doc.get("dependency-groups")
    if dep_groups is not None:
        if not isinstance(dep_groups, dict):
            return [], False
        for group_list in dep_groups.values():
            if not isinstance(group_list, list):
                return [], False
            for item in group_list:
                if not isinstance(item, str):
                    continue
                parsed = _parse_pep508_requirement(item)
                if parsed is not None:
                    name, ver, pinned = parsed
                    deps.append(
                        Dependency(
                            ecosystem="PyPI",
                            name=name,
                            version=ver,
                            pinned=pinned,
                            file_path=file_path,
                            line=_find_line(item),
                            source="manifest",
                        )
                    )

    return deps, True


def _parse_package_json_file(file_path: str, data: bytes) -> tuple[list[Dependency], bool]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return [], False

    try:
        doc = json.loads(text)
    except json.JSONDecodeError, ValueError:
        return [], False

    if not isinstance(doc, dict):
        return [], False

    file_lines = text.splitlines()

    def _find_package_line(pkg: str) -> int:
        target = f'"{pkg}"'
        for idx, line in enumerate(file_lines, start=1):
            if target in line:
                return idx
        return 1

    deps: list[Dependency] = []
    for section in ("dependencies", "devDependencies", "optionalDependencies"):
        section_data = doc.get(section)
        if section_data is None:
            continue
        if not isinstance(section_data, dict):
            return [], False
        for pkg_name, ver_val in section_data.items():
            if not isinstance(pkg_name, str) or not isinstance(ver_val, str):
                return [], False
            ver_clean = ver_val.strip()
            if NPM_PINNED_RE.match(ver_clean):
                pinned = True
                version = ver_clean
            else:
                pinned = False
                version = None
            deps.append(
                Dependency(
                    ecosystem="npm",
                    name=pkg_name,
                    version=version,
                    pinned=pinned,
                    file_path=file_path,
                    line=_find_package_line(pkg_name),
                    source="manifest",
                )
            )

    return deps, True


def parse_dependencies(
    snapshot: Snapshot,
    install_findings: list[Finding],
) -> tuple[list[Dependency], list[str]]:
    """Parse dependencies from snapshot manifests and install findings."""
    deps: list[Dependency] = []
    invalid_manifests: list[str] = []

    for file_path in sorted(snapshot.files.keys()):
        basename = file_path.rsplit("/", 1)[-1]
        data = snapshot.files[file_path]

        if basename.startswith("requirements") and basename.endswith(".txt"):
            manifest_deps, ok = _parse_requirements_file(file_path, data)
            if ok:
                deps.extend(manifest_deps)
            else:
                invalid_manifests.append(file_path)
        elif basename == "pyproject.toml":
            manifest_deps, ok = _parse_pyproject_file(file_path, data)
            if ok:
                deps.extend(manifest_deps)
            else:
                invalid_manifests.append(file_path)
        elif basename == "package.json":
            manifest_deps, ok = _parse_package_json_file(file_path, data)
            if ok:
                deps.extend(manifest_deps)
            else:
                invalid_manifests.append(file_path)

    for f in install_findings:
        if f.rule_id == "install.package" and f.token is not None and f.ecosystem is not None:
            deps.append(
                Dependency(
                    ecosystem=f.ecosystem,
                    name=f.token,
                    version=f.version,
                    pinned=f.version is not None,
                    file_path=f.file_path,
                    line=f.line,
                    source="install",
                )
            )

    deps.sort(key=lambda d: (d.file_path, d.line))

    seen: set[tuple[str, str, str | None, str, int]] = set()
    unique_deps: list[Dependency] = []
    for d in deps:
        key = (d.ecosystem, d.name, d.version, d.file_path, d.line)
        if key not in seen:
            seen.add(key)
            unique_deps.append(d)

    sorted_invalid = sorted(dict.fromkeys(invalid_manifests))
    return unique_deps, sorted_invalid


__all__ = ["Dependency", "parse_dependencies"]
