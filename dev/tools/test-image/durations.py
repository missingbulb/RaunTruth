"""Writes durations.json, what each test took, from the output of a pytest run with --durations=0 (a file, or stdin):
the seconds of each test's call, setup and teardown summed, to a tenth. shard.py splits the PR's runners by it; a test
it does not name counts as a middling one, so a stale file costs balance, never a test.
    python3 -m pytest ... --durations=0 > run.txt; python3 dev/tools/test-image/durations.py run.txt"""
import json
import re
import sys

from shard import TOOK


def took(lines):
    out = {}
    for line in lines:
        m = re.match(r'^\s*([\d.]+)s (?:call|setup|teardown)\s+(\S+)', line)
        if m:
            out[m.group(2)] = out.get(m.group(2), 0) + float(m.group(1))
    return {i: round(s, 1) for i, s in sorted(out.items())}


if __name__ == '__main__':
    with (open(sys.argv[1], encoding='utf-8') if len(sys.argv) > 1 else sys.stdin) as f:
        measured = took(f)
    with open(TOOK, 'w', encoding='utf-8') as f:
        json.dump(measured, f, indent=0, sort_keys=True)
        f.write('\n')
    print(f'{len(measured)} tests timed, {sum(measured.values()):.0f} s in all')
