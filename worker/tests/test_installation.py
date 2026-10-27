"""Tests for installation analysis, remote classification, and install steps."""

import json

from auditor_worker.findings import Finding
from auditor_worker.installation import (
    InstallContext,
    apply_remote_severity,
    classify_remote,
    install_steps,
    plugin_name_for,
    readme_findings,
)
from auditor_worker.snapshot import Snapshot


def test_classify_remote() -> None:
    # None or non-https -> other / critical
    assert classify_remote(None, "codelab614", "skills") == ("other", "critical")
    assert classify_remote("http://bun.sh/install", "codelab614", "skills") == ("other", "critical")
    assert classify_remote("https://", "codelab614", "skills") == ("other", "critical")

    # known-installer -> medium
    assert classify_remote("https://bun.sh/install", "codelab614", "skills") == ("known-installer", "medium")
    assert classify_remote("https://DENO.LAND/install.sh", "codelab614", "skills") == ("known-installer", "medium")
    assert classify_remote("https://sh.rustup.rs", "codelab614", "skills") == ("known-installer", "medium")
    assert classify_remote("https://astral.sh/uv/install.sh", "codelab614", "skills") == ("known-installer", "medium")
    assert classify_remote("https://get.pnpm.io/install.sh", "codelab614", "skills") == ("known-installer", "medium")
    assert classify_remote(
        "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh",
        "codelab614",
        "skills",
    ) == ("known-installer", "medium")

    # same-repo-commit (case-insensitive owner/repo, 40-char hex commit) -> low
    sha = "0123456789abcdef0123456789abcdef01234567"
    raw_commit_url = f"https://raw.githubusercontent.com/CodeLab614/Skills/{sha}/scripts/install.sh"
    assert classify_remote(raw_commit_url, "codelab614", "skills") == ("same-repo-commit", "low")

    github_commit_url = f"https://github.com/CodeLab614/Skills/raw/{sha}/scripts/install.sh"
    assert classify_remote(github_commit_url, "codelab614", "skills") == ("same-repo-commit", "low")

    # same-repo-ref (branches, tags like v1.0, main) -> medium
    raw_tag_url = "https://raw.githubusercontent.com/codelab614/skills/v1.0/scripts/install.sh"
    assert classify_remote(raw_tag_url, "CodeLab614", "Skills") == ("same-repo-ref", "medium")

    github_branch_url = "https://github.com/codelab614/skills/raw/main/install.sh"
    assert classify_remote(github_branch_url, "codelab614", "skills") == ("same-repo-ref", "medium")

    # other (gists, releases, another repo by same owner) -> critical
    gist_url = "https://gist.githubusercontent.com/codelab614/12345/raw/install.sh"
    assert classify_remote(gist_url, "codelab614", "skills") == ("other", "critical")

    release_url = "https://github.com/codelab614/skills/releases/download/v1.0/install.sh"
    assert classify_remote(release_url, "codelab614", "skills") == ("other", "critical")

    other_repo_url = f"https://raw.githubusercontent.com/codelab614/other-repo/{sha}/install.sh"
    assert classify_remote(other_repo_url, "codelab614", "skills") == ("other", "critical")


def test_apply_remote_severity() -> None:
    f_known = Finding(
        rule_id="install.remote-script",
        category="install",
        severity_undeclared="critical",
        severity_declared="critical",
        file_path="scripts/run.sh",
        line=1,
        title="Remote install",
        evidence="curl https://bun.sh/install | sh",
        url="https://bun.sh/install",
    )
    f_none = Finding(
        rule_id="install.remote-script",
        category="install",
        severity_undeclared="low",
        severity_declared="low",
        file_path="scripts/run.sh",
        line=2,
        title="Remote install",
        evidence="curl | sh",
        url=None,
    )
    f_other_rule = Finding(
        rule_id="install.package",
        category="install",
        severity_undeclared="high",
        severity_declared="low",
        file_path="scripts/run.sh",
        line=3,
        title="Package install",
        evidence="pip install foo",
        token="foo",
    )
    findings = [f_known, f_none, f_other_rule]

    apply_remote_severity(findings, "owner", "repo")
    assert f_known.severity_undeclared == "medium"
    assert f_known.severity_declared == "medium"
    assert f_none.severity_undeclared == "critical"
    assert f_none.severity_declared == "critical"
    assert f_other_rule.severity_undeclared == "high"
    assert f_other_rule.severity_declared == "low"


def test_readme_findings_only_install() -> None:
    readme_content = (
        b"# Guide\n\n```sh\ncurl -fsSL https://bun.sh/install | bash\npip install requests\ncat ~/.ssh/id_rsa\n```\n"
    )
    snapshot = Snapshot(
        files={},
        symlinks={},
        submodules=[],
        readmes={"README.md": readme_content},
    )

    findings = readme_findings(snapshot)
    assert len(findings) >= 2
    for f in findings:
        assert f.rule_id.startswith("install.")
        assert f.file_path == "README.md"
    assert any(f.rule_id == "install.remote-script" for f in findings)
    assert any(f.rule_id == "install.package" for f in findings)
    assert not any(f.rule_id.startswith("secrets.") for f in findings)


def test_install_steps_folder_plugin_readme() -> None:
    readme_content = (
        b"```sh\n"
        b"curl -fsSL https://bun.sh/install | bash\n"
        b"pip install foo\n"
        b"git clone https://github.com/example/repo\n"
        b"cp foo.txt bar.txt\n"
        b"```\n"
    )
    snapshot = Snapshot(
        files={},
        symlinks={},
        submodules=[],
        readmes={"README.md": readme_content},
    )
    rf = readme_findings(snapshot)
    ctx = InstallContext(
        display_owner="test-owner",
        display_repo="test-repo",
        skill_name="demo-skill",
        skill_path="skills/demo",
        plugin_name="demo-plugin",
    )

    steps = install_steps(ctx, snapshot, rf)
    assert len(steps) == 6

    # 1. folder
    assert steps[0].method == "folder"
    assert steps[0].command == "npx skills add test-owner/test-repo --skill demo-skill"
    assert steps[0].touches == "Copia la carpeta `skills/demo` en la carpeta de skills del agente"
    assert steps[0].source is None
    assert steps[0].matches_declared is True

    # 2. plugin
    assert steps[1].method == "plugin"
    assert steps[1].command == "/plugin install demo-plugin"
    assert steps[1].touches == "Activa los hooks, comandos, agentes y MCP del plugin"
    assert steps[1].source is None
    assert steps[1].matches_declared is True

    # 3. readme: curl ... | bash
    assert steps[2].method == "readme"
    assert steps[2].command == "curl -fsSL https://bun.sh/install | bash"
    assert steps[2].source == "README.md:2"
    assert steps[2].touches == "Descarga y ejecuta un script remoto"

    # 4. readme: pip install foo
    assert steps[3].method == "readme"
    assert steps[3].command == "pip install foo"
    assert steps[3].source == "README.md:3"
    assert steps[3].touches == "Instala paquetes: foo"

    # 5. readme: git clone
    assert steps[4].method == "readme"
    assert steps[4].command == "git clone https://github.com/example/repo"
    assert steps[4].source == "README.md:4"
    assert steps[4].touches == "Clona un repositorio"

    # 6. readme: cp
    assert steps[5].method == "readme"
    assert steps[5].command == "cp foo.txt bar.txt"
    assert steps[5].source == "README.md:5"
    assert steps[5].touches == "Copia archivos"


def test_matches_declared() -> None:
    readme_content = b"```sh\npip install a\npip install b\ngit clone https://example.com/repo\n```\n"
    snapshot = Snapshot(
        files={},
        symlinks={},
        submodules=[],
        readmes={"README.md": readme_content},
    )
    rf = readme_findings(snapshot)
    for f in rf:
        if f.line == 2:
            f.declared = True
        elif f.line == 3:
            f.declared = False

    ctx = InstallContext(
        display_owner="owner",
        display_repo="repo",
        skill_name="skill",
        skill_path="",
        plugin_name=None,
    )
    steps = install_steps(ctx, snapshot, rf)

    # Empty skill_path gives "(raíz del repositorio)"
    assert steps[0].touches == "Copia la carpeta (raíz del repositorio) en la carpeta de skills del agente"

    # line 2 (pip install a) -> declared=True
    step_a = next(s for s in steps if s.command == "pip install a")
    assert step_a.matches_declared is True

    # line 3 (pip install b) -> declared=False
    step_b = next(s for s in steps if s.command == "pip install b")
    assert step_b.matches_declared is False

    # line 4 (git clone ...) -> no findings -> matches_declared=True
    step_clone = next(s for s in steps if s.command.startswith("git clone"))
    assert step_clone.matches_declared is True


def test_plugin_name_for_nearest() -> None:
    root_plugin = json.dumps({"name": "root-plugin"}).encode("utf-8")
    nested_plugin = json.dumps({"name": "nested-plugin"}).encode("utf-8")
    files = {
        ".claude-plugin/plugin.json": root_plugin,
        "packages/my-plugin/.claude-plugin/plugin.json": nested_plugin,
    }
    snapshot = Snapshot(files=files, symlinks={}, submodules=[], readmes={})

    # Nearest ancestor for nested skill
    assert plugin_name_for(snapshot, "packages/my-plugin/skills/foo") == "nested-plugin"
    assert plugin_name_for(snapshot, "packages/my-plugin") == "nested-plugin"

    # Falls back to root plugin when no closer ancestor exists
    assert plugin_name_for(snapshot, "other-folder/skill") == "root-plugin"
    assert plugin_name_for(snapshot, "") == "root-plugin"


def test_plugin_name_broken_json_is_none() -> None:
    broken = b"{not-a-valid-json"
    empty_name = json.dumps({"name": "   "}).encode("utf-8")
    no_name = json.dumps({"other": "field"}).encode("utf-8")

    snapshot_broken = Snapshot(
        files={".claude-plugin/plugin.json": broken},
        symlinks={},
        submodules=[],
        readmes={},
    )
    assert plugin_name_for(snapshot_broken, "") is None

    snapshot_empty = Snapshot(
        files={".claude-plugin/plugin.json": empty_name},
        symlinks={},
        submodules=[],
        readmes={},
    )
    assert plugin_name_for(snapshot_empty, "") is None

    snapshot_no_name = Snapshot(
        files={".claude-plugin/plugin.json": no_name},
        symlinks={},
        submodules=[],
        readmes={},
    )
    assert plugin_name_for(snapshot_no_name, "") is None


def test_readme_inside_skill_folder_not_scanned_twice() -> None:
    readme_content = b"```bash\npip install foo\n```\n"
    snapshot = Snapshot(
        files={"skills/x/README.md": readme_content},
        symlinks={},
        submodules=[],
        readmes={"skills/x/README.md": readme_content},
    )
    assert readme_findings(snapshot) == []
