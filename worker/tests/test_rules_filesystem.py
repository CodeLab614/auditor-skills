"""Tests for filesystem rules: fs.delete-outside, fs.write-outside, and fs.persistence."""

from auditor_worker.rules.filesystem import scan_lines


def test_fs_write_inside_skill_folder_is_not_reported() -> None:
    """Writing to paths inside current folder does not trigger fs.write-outside."""
    line = 'with open("./out.txt", "w") as f: f.write("data")'
    findings = scan_lines("script.py", "python", [(1, line)])
    assert not any(f.rule_id == "fs.write-outside" for f in findings)


def test_fs_write_tmp_is_not_reported() -> None:
    """Writing to /tmp/ paths is safe and ignored by fs.write-outside."""
    py_line = 'open("/tmp/scratch.txt", "w").write("temp")'
    py_findings = scan_lines("clean.py", "python", [(1, py_line)])
    assert not any(f.rule_id == "fs.write-outside" for f in py_findings)

    sh_line = "echo 'temp' > /tmp/bar"
    sh_findings = scan_lines("clean.sh", "shell", [(1, sh_line)])
    assert not any(f.rule_id == "fs.write-outside" for f in sh_findings)


def test_fs_cp_source_outside_dest_inside_is_not_write() -> None:
    """Copying from an outside source into current directory is not write-outside."""
    line = "cp ~/.ssh/config ./"
    findings = scan_lines("copy.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "fs.write-outside" for f in findings)

    # Near positive: copying to outside destination triggers write-outside
    pos_line = "cp ./config ~/.ssh/config"
    pos_findings = scan_lines("copy.sh", "shell", [(1, pos_line)])
    write_findings = [f for f in pos_findings if f.rule_id == "fs.write-outside"]
    assert len(write_findings) == 1
    assert write_findings[0].token == "~/.ssh/config"


def test_fs_delete_home() -> None:
    """Deleting outside path in shell triggers fs.delete-outside with critical severity."""
    line = "rm -rf ~/projects"
    findings = scan_lines("cleanup.sh", "shell", [(1, line)])
    del_findings = [f for f in findings if f.rule_id == "fs.delete-outside"]
    assert len(del_findings) == 1
    assert del_findings[0].token == "~/projects"
    assert del_findings[0].severity_undeclared == "critical"
    assert del_findings[0].severity_declared == "medium"

    # Near negative: deleting local file
    neg_line = "rm -f ./temp.txt"
    neg_findings = scan_lines("cleanup.sh", "shell", [(1, neg_line)])
    assert not any(f.rule_id == "fs.delete-outside" for f in neg_findings)


def test_fs_persistence_zshrc_append() -> None:
    """Appending to ~/.zshrc triggers fs.persistence and suppresses fs.write-outside."""
    line = "echo 'x' >> ~/.zshrc"
    findings = scan_lines("setup.sh", "shell", [(1, line)])
    pers_findings = [f for f in findings if f.rule_id == "fs.persistence"]
    assert len(pers_findings) == 1
    assert pers_findings[0].token == "~/.zshrc"
    assert pers_findings[0].severity_undeclared == "critical"
    assert pers_findings[0].severity_declared == "medium"
    assert not any(f.rule_id == "fs.write-outside" for f in findings)


def test_fs_persistence_crontab_list_is_not_reported() -> None:
    """Listing crontab with crontab -l is safe and not reported."""
    line = "crontab -l"
    findings = scan_lines("check.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "fs.persistence" for f in findings)

    # Near positive: modifying crontab
    pos_line = "crontab /tmp/newcron"
    pos_findings = scan_lines("check.sh", "shell", [(1, pos_line)])
    pers_findings = [f for f in pos_findings if f.rule_id == "fs.persistence"]
    assert len(pers_findings) == 1
    assert pers_findings[0].token == "crontab"


def test_fs_persistence_claude_settings() -> None:
    """Writing to ~/.claude/settings.json from python triggers fs.persistence."""
    line = 'with open("~/.claude/settings.json", "w") as f: f.write("{}")'
    findings = scan_lines("hook.py", "python", [(1, line)])
    pers_findings = [f for f in findings if f.rule_id == "fs.persistence"]
    assert len(pers_findings) == 1
    assert pers_findings[0].token == "~/.claude/settings.json"
    assert not any(f.rule_id == "fs.write-outside" for f in findings)


def test_fs_delete_python_shutil() -> None:
    """shutil.rmtree targeting outside path triggers fs.delete-outside."""
    line = 'shutil.rmtree("/etc/nginx")'
    findings = scan_lines("del.py", "python", [(1, line)])
    del_findings = [f for f in findings if f.rule_id == "fs.delete-outside"]
    assert len(del_findings) == 1
    assert del_findings[0].token == "/etc/nginx"

    # Near negative: removing local cache folder
    neg_line = 'shutil.rmtree("./cache")'
    neg_findings = scan_lines("del.py", "python", [(1, neg_line)])
    assert not any(f.rule_id == "fs.delete-outside" for f in neg_findings)


def test_fs_delete_js_rimraf() -> None:
    """rimraf or fs.rm on outside path in JavaScript triggers fs.delete-outside."""
    line = 'rimraf("/var/data")'
    findings = scan_lines("del.js", "js", [(1, line)])
    del_findings = [f for f in findings if f.rule_id == "fs.delete-outside"]
    assert len(del_findings) == 1
    assert del_findings[0].token == "/var/data"

    # Near negative: removing inside path
    neg_line = 'fs.rmSync("./build", { recursive: true })'
    neg_findings = scan_lines("del.js", "js", [(1, neg_line)])
    assert not any(f.rule_id == "fs.delete-outside" for f in neg_findings)


def test_fs_delete_powershell() -> None:
    """PowerShell Remove-Item targeting outside path triggers fs.delete-outside."""
    line = r"Remove-Item -Recurse -Force $env:USERPROFILE\secret"
    findings = scan_lines("del.ps1", "powershell", [(1, line)])
    del_findings = [f for f in findings if f.rule_id == "fs.delete-outside"]
    assert len(del_findings) == 1

    # Near negative: local path
    neg_line = r"Remove-Item -Recurse -Force .\build"
    neg_findings = scan_lines("del.ps1", "powershell", [(1, neg_line)])
    assert not any(f.rule_id == "fs.delete-outside" for f in neg_findings)


def test_fs_write_python_write_text() -> None:
    """Path.write_text on outside path triggers fs.write-outside."""
    line = 'Path("/etc/hosts").write_text("127.0.0.1 malicious")'
    findings = scan_lines("mod.py", "python", [(1, line)])
    write_findings = [f for f in findings if f.rule_id == "fs.write-outside"]
    assert len(write_findings) == 1
    assert write_findings[0].token == "/etc/hosts"
    assert write_findings[0].severity_undeclared == "high"
    assert write_findings[0].severity_declared == "medium"

    # Near negative: local file write_text
    neg_line = 'Path("./output.txt").write_text("hello")'
    neg_findings = scan_lines("mod.py", "python", [(1, neg_line)])
    assert not any(f.rule_id == "fs.write-outside" for f in neg_findings)


def test_fs_write_js_create_write_stream() -> None:
    """createWriteStream targeting outside path in JS triggers fs.write-outside."""
    line = 'const stream = fs.createWriteStream("/var/run/app.pid");'
    findings = scan_lines("stream.js", "js", [(1, line)])
    write_findings = [f for f in findings if f.rule_id == "fs.write-outside"]
    assert len(write_findings) == 1
    assert write_findings[0].token == "/var/run/app.pid"

    # Near negative: inside stream
    neg_line = 'const stream = fs.createWriteStream("./app.pid");'
    neg_findings = scan_lines("stream.js", "js", [(1, neg_line)])
    assert not any(f.rule_id == "fs.write-outside" for f in neg_findings)


def test_fs_write_powershell_set_content() -> None:
    """PowerShell Set-Content targeting outside path triggers fs.write-outside."""
    line = r'Set-Content -Path $env:USERPROFILE\evil.bat -Value "calc"'
    findings = scan_lines("payload.ps1", "powershell", [(1, line)])
    write_findings = [f for f in findings if f.rule_id == "fs.write-outside"]
    assert len(write_findings) == 1

    # Near negative: local file
    neg_line = r'Set-Content -Path .\out.txt -Value "ok"'
    neg_findings = scan_lines("payload.ps1", "powershell", [(1, neg_line)])
    assert not any(f.rule_id == "fs.write-outside" for f in neg_findings)


def test_fs_persistence_in_config_file() -> None:
    """Persistence path mentioned in a config file triggers fs.persistence."""
    line = '{"target": "~/.bashrc"}'
    findings = scan_lines("settings.json", "config", [(1, line)])
    pers_findings = [f for f in findings if f.rule_id == "fs.persistence"]
    assert len(pers_findings) == 1
    assert pers_findings[0].token == ".bashrc"

    # Near negative: normal profile keyword
    neg_line = '{"profile_name": "developer"}'
    neg_findings = scan_lines("settings.json", "config", [(1, neg_line)])
    assert not any(f.rule_id == "fs.persistence" for f in neg_findings)


def test_placeholder_is_not_redirection() -> None:
    """Documentation placeholders like <skill-dir> are not mistaken for redirections."""
    line = "node <skill-dir>/validate-findings.cjs <output-dir>/findings.json"
    findings = scan_lines("run.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "fs.write-outside" for f in findings)

    # Real redirection still triggers write-outside
    real_line = "echo x > /etc/hosts"
    real_findings = scan_lines("run.sh", "shell", [(1, real_line)])
    assert any(f.rule_id == "fs.write-outside" and f.token == "/etc/hosts" for f in real_findings)


def test_placeholder_in_url_is_not_redirection() -> None:
    """A URL with placeholders inside quotes does not trigger fs.write-outside."""
    line = '"endpoint": "https://<your-tunnel-domain>/webhook",'
    findings = scan_lines("config.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "fs.write-outside" for f in findings)


def test_redirect_inside_quotes_is_not_write() -> None:
    """Redirection operators inside quotes do not count as write-outside."""
    line = 'echo "a > /etc/x"'
    findings = scan_lines("echo.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "fs.write-outside" for f in findings)
