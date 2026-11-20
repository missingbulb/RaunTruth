"""Runs a test's Node driver for a pytest test: its output printed, which pytest shows for a failed test; exit 2, the
driver saying it cannot run here (no Playwright, no browser), a skip, which CI fails (pytest_ci.py); any other non-zero
exit a failure carrying what it said. One still running at timeout is stopped, and the failure says how far it got."""
import shutil
import subprocess

import pytest

NODE = shutil.which('node')


def run_driver(path, *args, timeout=120, env=None):
    try:
        r = subprocess.run([NODE, path, *args], capture_output=True, text=True, timeout=timeout, env=env)
    except subprocess.TimeoutExpired as e:
        out = lambda b: (b.decode() if isinstance(b, bytes) else b) or ''
        pytest.fail(f'{path} still running after {e.timeout:g} s; it had got this far:\n{out(e.stdout)}{out(e.stderr)}')
    print(r.stdout, r.stderr)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    assert r.returncode == 0, r.stdout + r.stderr
    return r
