"""Runs a test's Node driver for a pytest test: its output printed, which pytest shows for a failed test; exit 2, the
driver saying it cannot run here (no Playwright, no browser), a skip, which CI fails (pytest_ci.py); any other non-zero
exit a failure carrying what it said. One still running at timeout is stopped, and the failure says how far it got."""
import shutil
import subprocess

import pytest

NODE = shutil.which('node')
# how long a driver asked to stop has to say how far it got
STOPPING = 10


def run_driver(path, *args, timeout=120, env=None):
    with subprocess.Popen([NODE, path, *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env) as p:
        try:
            out, err = p.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            # asked to stop first, so it says what it was doing; killed if it does not
            p.terminate()
            try:
                out, err = p.communicate(timeout=STOPPING)
            except subprocess.TimeoutExpired:
                p.kill()
                out, err = p.communicate()
            pytest.fail(f'{path} still running after {timeout:g} s; it had got this far:\n{out}{err}')
    print(out, err)
    if p.returncode == 2:
        pytest.skip(err.strip())
    assert p.returncode == 0, out + err
    return subprocess.CompletedProcess(p.args, p.returncode, out, err)
