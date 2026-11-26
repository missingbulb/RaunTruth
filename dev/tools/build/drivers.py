"""Runs a test's Node driver for a pytest test: its output printed, which pytest shows for a failed test; exit 2, the
driver saying it cannot run here (no Playwright, no browser), a skip, which CI fails (pytest_ci.py); any other non-zero
exit a failure carrying what it said. One still running at timeout is asked to stop, then stopped, and the failure says
how far it got. check=False: for a test that reads the exit code and the output itself; node_args: Node's own
arguments, before the script (an inline one: node_args=['--input-type=module', '-e', code], path=None)."""
import shutil
import subprocess

import pytest

NODE = shutil.which('node')
# how long a driver asked to stop has to say how far it got
STOPPING = 10


def run_driver(path, *args, timeout=120, env=None, cwd=None, check=True, node_args=()):
    command = [NODE, *node_args, *([path] if path else []), *map(str, args)]
    with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, cwd=cwd) as p:
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
            pytest.fail(f'{path or "the script"} still running after {timeout:g} s; it had got this far:\n{out}{err}')
    r = subprocess.CompletedProcess(command, p.returncode, out, err)
    if not check:
        return r
    print(out, err)
    if r.returncode == 2:
        pytest.skip(err.strip())
    assert r.returncode == 0, out + err
    return r
