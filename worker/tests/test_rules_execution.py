"""Tests for execution rules: exec.command and exec.dynamic."""

from auditor_worker.rules.execution import scan_lines


def test_exec_command_list_literal_token() -> None:
    """subprocess.run with list literal extracts first element as token."""
    line = 'subprocess.run(["git", "fetch", "--all"])'
    findings = scan_lines("task.py", "python", [(1, line)])
    cmd_findings = [f for f in findings if f.rule_id == "exec.command"]
    assert len(cmd_findings) == 1
    assert cmd_findings[0].token == "git"
    assert cmd_findings[0].severity_undeclared == "low"
    assert cmd_findings[0].severity_declared == "low"

    # Near negative: non-literal variable produces token None
    dyn_line = "subprocess.run(target_cmd)"
    dyn_findings = scan_lines("task.py", "python", [(1, dyn_line)])
    dyn_cmd = [f for f in dyn_findings if f.rule_id == "exec.command"]
    assert len(dyn_cmd) == 1
    assert dyn_cmd[0].token is None


def test_exec_command_not_reported_in_shell_files() -> None:
    """exec.command is never reported for shell files where commands are normal syntax."""
    line = "git fetch --all"
    findings = scan_lines("script.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "exec.command" for f in findings)


def test_re_compile_is_not_exec_dynamic() -> None:
    """re.compile must not be mistaken for dynamic code compilation."""
    line = 'pattern = re.compile(r"^https?://")'
    findings = scan_lines("validator.py", "python", [(1, line)])
    assert not any(f.rule_id == "exec.dynamic" for f in findings)

    # Positive: built-in compile without dot prefix
    pos_line = 'code = compile("1 + 1", "<string>", "eval")'
    pos_findings = scan_lines("calc.py", "python", [(1, pos_line)])
    assert any(f.rule_id == "exec.dynamic" for f in pos_findings)


def test_shell_eval_is_dynamic() -> None:
    """Shell eval keyword is reported as exec.dynamic."""
    line = 'eval "$USER_CMD"'
    findings = scan_lines("runner.sh", "shell", [(1, line)])
    dynamic_findings = [f for f in findings if f.rule_id == "exec.dynamic"]
    assert len(dynamic_findings) == 1
    assert dynamic_findings[0].token is None
    assert dynamic_findings[0].severity_undeclared == "medium"
    assert dynamic_findings[0].severity_declared == "medium"

    # Near negative: word evaluation does not trigger dynamic eval
    neg_line = 'echo "Running evaluation step"'
    neg_findings = scan_lines("runner.sh", "shell", [(1, neg_line)])
    assert not any(f.rule_id == "exec.dynamic" for f in neg_findings)


def test_js_child_process_and_new_function() -> None:
    """JS execSync extracts command token, and new Function triggers exec.dynamic."""
    line_exec = 'const res = execSync("npm test");'
    findings_exec = scan_lines("build.js", "js", [(1, line_exec)])
    assert any(f.rule_id == "exec.command" and f.token == "npm" for f in findings_exec)

    line_fn = 'const fn = new Function("x", "return x * 2;");'
    findings_fn = scan_lines("build.js", "js", [(2, line_fn)])
    assert any(f.rule_id == "exec.dynamic" for f in findings_fn)


def test_placeholder_eval_is_not_dynamic() -> None:
    """Documentation placeholder <eval prompt> in shell is not mistaken for dynamic eval."""
    line = "- Task: <eval prompt>"
    findings = scan_lines("instructions.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "exec.dynamic" for f in findings)
