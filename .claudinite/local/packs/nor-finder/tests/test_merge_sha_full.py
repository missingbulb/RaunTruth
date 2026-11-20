"""The merge-sha-full guard, run through the engine's own pre-tool-use hook.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
import json
import os
import subprocess

import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
CN = os.path.join(ROOT, '.claudinite', 'bin', 'cn')
FULL = '9866144a1b2c3d4e5f60718293a4b5c6d7e8f901'


def guarded(tmp_path, tool_input):
    """Whether the hook names merge-sha-full for a merge call with this input, merge-to-main loaded."""
    transcript = tmp_path / 'transcript.jsonl'
    transcript.write_text(json.dumps({'type': 'assistant', 'uuid': 'a1', 'timestamp': '2026-11-20T03:00:00Z',
                                      'message': {'role': 'assistant', 'content': [
                                          {'type': 'tool_use', 'id': 't1', 'name': 'Skill', 'input': {'skill': 'merge-to-main'}}]}}) + '\n')
    event = {'hook_event_name': 'PreToolUse', 'tool_name': 'mcp__github__merge_pull_request',
             'tool_input': {'owner': 'acme', 'repo': 'acme-site', 'pullNumber': 1, **tool_input},
             'cwd': ROOT, 'session_id': 'acme', 'transcript_path': str(transcript)}
    out = subprocess.run([CN, 'hook', 'pre-tool-use'], input=json.dumps(event), capture_output=True, text=True, cwd=ROOT)
    return 'merge-sha-full' in out.stdout + out.stderr


@pytest.mark.parametrize('sha', [FULL[:7], FULL + '2', 'HEAD'])
def test_a_short_long_or_symbolic_head_sha_is_found(tmp_path, sha):
    assert guarded(tmp_path, {'expectedHeadSha': sha})


@pytest.mark.parametrize('tool_input', [{'expectedHeadSha': FULL}, {'expectedHeadSha': FULL.upper()}, {}])
def test_the_full_sha_in_either_case_and_no_sha_are_not(tmp_path, tool_input):
    assert not guarded(tmp_path, tool_input)
