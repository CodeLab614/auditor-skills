"""Tests for obfuscation rules: obf.decode-exec, obf.blob, and obf.char-build."""

from auditor_worker.rules.obfuscation import scan_lines


def test_shell_base64_pipe_bash() -> None:
    """Shell piping base64 -d directly to bash triggers obf.decode-exec with critical severity."""
    pos_line = 'echo "bHMgLWxhCg==" | base64 -d | bash'
    findings = scan_lines("run.sh", "shell", [(1, pos_line)])
    obf_findings = [f for f in findings if f.rule_id == "obf.decode-exec"]
    assert len(obf_findings) == 1
    assert obf_findings[0].severity_undeclared == "critical"
    assert obf_findings[0].severity_declared == "critical"

    # Near negative: piping base64 -d to grep or file is safe
    neg_line = 'echo "bHMgLWxhCg==" | base64 -d | grep target'
    neg_findings = scan_lines("run.sh", "shell", [(1, neg_line)])
    assert not any(f.rule_id == "obf.decode-exec" for f in neg_findings)


def test_shell_eval_base64_d() -> None:
    """eval together with base64 -d in the same line triggers obf.decode-exec."""
    pos_line = 'eval "$(echo $PAYLOAD | base64 -d)"'
    findings = scan_lines("run.sh", "shell", [(1, pos_line)])
    obf_findings = [f for f in findings if f.rule_id == "obf.decode-exec"]
    assert len(obf_findings) == 1


def test_python_exec_b64decode() -> None:
    """Python pairing exec with b64decode triggers obf.decode-exec."""
    pos_line = "exec(b64decode(payload))"
    findings = scan_lines("runner.py", "python", [(1, pos_line)])
    obf_findings = [f for f in findings if f.rule_id == "obf.decode-exec"]
    assert len(obf_findings) == 1
    assert obf_findings[0].severity_undeclared == "critical"

    # Near negative: b64decode without exec/eval
    neg_line = "content = b64decode(encoded_string)"
    neg_findings = scan_lines("runner.py", "python", [(1, neg_line)])
    assert not any(f.rule_id == "obf.decode-exec" for f in neg_findings)


def test_js_eval_atob() -> None:
    """JavaScript pairing eval with atob triggers obf.decode-exec."""
    pos_line = "eval(atob(obfuscatedCode));"
    findings = scan_lines("runner.js", "js", [(1, pos_line)])
    obf_findings = [f for f in findings if f.rule_id == "obf.decode-exec"]
    assert len(obf_findings) == 1
    assert obf_findings[0].severity_undeclared == "critical"

    # Near negative: atob decoded to variable without dynamic evaluation
    neg_line = "const plain = atob(obfuscatedCode);"
    neg_findings = scan_lines("runner.js", "js", [(1, neg_line)])
    assert not any(f.rule_id == "obf.decode-exec" for f in neg_findings)


def test_powershell_iex_frombase64() -> None:
    """PowerShell pairing iex with FromBase64String triggers obf.decode-exec."""
    pos_line = "iex ([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($raw)))"
    findings = scan_lines("run.ps1", "powershell", [(1, pos_line)])
    obf_findings = [f for f in findings if f.rule_id == "obf.decode-exec"]
    assert len(obf_findings) == 1

    # Near negative: FromBase64String alone
    neg_line = "$decoded = [System.Convert]::FromBase64String($raw)"
    neg_findings = scan_lines("run.ps1", "powershell", [(1, neg_line)])
    assert not any(f.rule_id == "obf.decode-exec" for f in neg_findings)


def test_base64_blob_200() -> None:
    """A continuous base64 string of 199 chars does not trigger obf.blob; 200 chars triggers it."""
    neg_line = f'data = "{"A" * 199}"'
    neg_findings = scan_lines("payload.py", "python", [(1, neg_line)])
    assert not any(f.rule_id == "obf.blob" for f in neg_findings)

    pos_line = f'data = "{"A" * 200}"'
    pos_findings = scan_lines("payload.py", "python", [(1, pos_line)])
    blob_findings = [f for f in pos_findings if f.rule_id == "obf.blob"]
    assert len(blob_findings) == 1
    assert blob_findings[0].severity_undeclared == "medium"
    assert blob_findings[0].severity_declared == "medium"


def test_char_build_threshold() -> None:
    """Threshold for obf.char-build is 8 chr(/String.fromCharCode or 20 \\x escapes."""
    # 7 chr( -> negative
    neg_chr = "+".join(["chr(65)"] * 7)
    neg_chr_findings = scan_lines("builder.py", "python", [(1, neg_chr)])
    assert not any(f.rule_id == "obf.char-build" for f in neg_chr_findings)

    # 8 chr( -> positive
    pos_chr = "+".join(["chr(65)"] * 8)
    pos_chr_findings = scan_lines("builder.py", "python", [(1, pos_chr)])
    chr_findings = [f for f in pos_chr_findings if f.rule_id == "obf.char-build"]
    assert len(chr_findings) == 1
    assert chr_findings[0].severity_undeclared == "medium"

    # 8 String.fromCharCode -> positive
    js_line = ";".join(["String.fromCharCode(65)"] * 8)
    js_findings = scan_lines("builder.js", "js", [(1, js_line)])
    assert any(f.rule_id == "obf.char-build" for f in js_findings)

    # 19 \\x escapes -> negative
    neg_hex = r"\x41" * 19
    neg_hex_findings = scan_lines("builder.py", "python", [(1, f'buf = "{neg_hex}"')])
    assert not any(f.rule_id == "obf.char-build" for f in neg_hex_findings)

    # 20 \\x escapes -> positive
    pos_hex = r"\x41" * 20
    pos_hex_findings = scan_lines("builder.py", "python", [(1, f'buf = "{pos_hex}"')])
    hex_findings = [f for f in pos_hex_findings if f.rule_id == "obf.char-build"]
    assert len(hex_findings) == 1
