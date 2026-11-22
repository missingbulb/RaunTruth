"""What the shell-states rules (dev/requirements/shell-states.json, each study's states.json grafted in) expect each
element to show in a state the explorer has read only part of (explore.mjs): one request a line on stdin,
{study, vars}, vars the state's vars the page let it read; one answer a line on stdout, a list of
{name, select, control, box, path, expect, approval, req}, path the names of the elements it is in, expect as the browser reads an element (on, off, held, folded,
gone). An element whose deciding case names a var not read, or sits under one undecided that way, is left out, and so
is one whose case is undecided. The rules are an unreviewed development harness (nor-finder's shell-states-unreviewed):
an answer is what the harness says, not what the owner approved.
    python3 web-tests/explore/shell_oracle.py
"""
import copy
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'dev', 'tools', 'build'))
import shell_states as ss  # noqa: E402

RULES, STUDIES = ss.load()
TREES = {}


def tree(study):
    if study not in TREES:
        TREES[study] = ss.graft(copy.deepcopy(RULES), STUDIES[study])['tree']
    return TREES[study]


def known(s):
    """The vars read, the study's own facts, and what the rules derive from them where every part is known."""
    d = dict(s)
    if 'annotating' in d and 'stage' in d:
        d['makesTruth'] = d['annotating'] and d['stage'] in ('Setup', 'Develop', 'Analyze')
    return d


def own(n, d):
    """(state, approval, req) of the first case matching, or None where a case before it cannot be told."""
    for case in n.get('rule', []):
        when = case.get('when', {})
        if any(k in d and d[k] not in vs for k, vs in when.items()):
            continue
        if any(k not in d for k in when):
            return None
        return case['is'], case.get('approval', 'owner'), case.get('req', n['req'])
    return 'shown', 'owner', n['req']


def expect(study, s):
    if study not in STUDIES:
        return []
    d = known({**ss.facts(STUDIES[study]), **s})
    states, out, paths = {}, [], {}
    for n, parent, _ in ss.nodes(tree(study)):
        paths[n['name']] = (paths[parent['name']] + [parent['name']]) if parent else []
        mine = own(n, d)
        up = states.get(parent['name']) if parent else ('shown', 'owner', None)
        if up is None:
            # under a parent that cannot be told: hidden alone is certain, its own rule hiding it
            mine = mine if mine and mine[0] == 'hidden' else None
        elif up[0] in ('hidden', 'under-hidden'):
            mine = ('under-hidden', up[1], up[2])
        elif up[0] in ('folded', 'in-folded'):
            mine = ('in-folded', up[1], up[2])
        states[n['name']] = mine
        if mine and mine[1] != 'undecided':
            out.append({'name': n['name'], 'select': n['select'], 'control': bool(n.get('control')), 'box': bool(n.get('box')), 'path': paths[n['name']],
                        'expect': ss.SEEN[mine[0]], 'approval': mine[1], 'req': mine[2] or n['req']})
    return out


for line in sys.stdin:
    q = json.loads(line)
    print(json.dumps(expect(q['study'], q['vars'])), flush=True)
