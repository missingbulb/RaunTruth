"""A study's own Python answering the page's calls for a stand-in worker (stand_in_drive.mjs), as the real worker's
bridge would (lab/README.md): one request a line on stdin, {id, name, bytes, action, args}, the file opened with the
study's read (its study.json names the entry module), `run` running one of its VERSIONS and any other action one of
its STAGES on the last run's answer, answered with one line on stdout, {meta, bytes} or {error}, the answer's arrays
as bytes one after the other. Each file is opened once and kept for the calls after it."""
import base64
import hashlib
import importlib
import json
import os
import sys
import tempfile
import traceback

STUDIES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'studies')
# a version asking for a service is answered natively, as the lab answers it
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lab'))
from run import Services
from study import Study, drive
modules, sessions = {}, {}


def module(i):
    if i not in modules:
        with open(os.path.join(STUDIES, i, 'study.json'), encoding='utf-8') as f:
            py = json.load(f)['python']
        sys.path[:0] = [os.path.join(STUDIES, i, p) for p in py['paths']]
        modules[i] = importlib.import_module(py['entry'])
    return modules[i]


def session(i, name, data):
    key = (i, hashlib.sha256(data).hexdigest())
    if key not in sessions:
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, os.path.basename(name))
            with open(path, 'wb') as f:
                f.write(data)
            sessions[key] = {'image': module(i).read(path), 'answer': None}
    return sessions[key]


def encode(x):
    parts, at = [], [0]

    def walk(v):
        if getattr(v, 'ndim', 0) > 0 and hasattr(v, 'tobytes'):
            b = v.tobytes(); parts.append(b); at[0] += len(b)
            return {'$bytes': [at[0] - len(b), len(b)], 'dtype': str(v.dtype), 'shape': list(v.shape)}
        if isinstance(v, (bytes, bytearray)):
            parts.append(bytes(v)); at[0] += len(v)
            return {'$bytes': [at[0] - len(v), len(v)], 'dtype': 'uint8', 'shape': [len(v)]}
        if isinstance(v, dict):
            return {str(k): walk(w) for k, w in v.items()}
        if isinstance(v, (list, tuple)):
            return [walk(w) for w in v]
        return v.item() if hasattr(v, 'item') else v
    return walk(x), (b''.join(parts) if parts else None)


def answer(m):
    s, study, args = session(m['id'], m['name'], base64.b64decode(m['bytes'])), module(m['id']), dict(m.get('args') or {})
    if m['action'] == 'run':
        s['answer'] = out = drive(study.VERSIONS[args.pop('algorithm')](s['image'], **args), Services(Study(m['id'])))
    else:
        out = drive(study.STAGES[m['action']](s['image'], s['answer'], **args), Services(Study(m['id'])))
    meta, data = encode(out)
    return {'meta': meta, 'bytes': base64.b64encode(data).decode() if data is not None else None}


for line in sys.stdin:
    try:
        out = answer(json.loads(line))
    except Exception:
        out = {'error': traceback.format_exc()}
    sys.stdout.write(json.dumps(out) + '\n')
    sys.stdout.flush()
