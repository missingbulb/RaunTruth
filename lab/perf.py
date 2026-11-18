"""The speed pass: a version timed and its peak memory measured on the study's images with ground truth, and a
signature of every answer it gives, so an optimisation is kept only when the answers stay bit-identical.

    python3 lab/perf.py STUDY snapshot VERSION   # record the version's answers' signatures, time and peak memory
    python3 lab/perf.py STUDY check VERSION      # run it again: fails unless every answer's signature is the same
    python3 lab/perf.py STUDY profile VERSION    # where its time goes, on the first image

Each image runs in a fresh process, so one image's peak memory is not another's. The records are kept in
data/raw/perf/, never in git.
"""
import argparse
import cProfile
import hashlib
import json
import os
import pstats
import subprocess
import sys
import time
import tracemalloc

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import run as lab_run
from study import Study


def signature(answer):
    """A SHA-256 over the whole answer, its arrays' dtypes, shapes and bytes included."""
    def walk(x):
        if hasattr(x, 'dtype') and hasattr(x, 'tobytes'):
            return ['array', str(x.dtype), list(getattr(x, 'shape', ())), hashlib.sha256(x.tobytes()).hexdigest()]
        if isinstance(x, dict):
            return {str(k): walk(v) for k, v in sorted(x.items(), key=lambda kv: str(kv[0])) if k != 'seconds'}
        if isinstance(x, (list, tuple)):
            return [walk(v) for v in x]
        if isinstance(x, float):
            return repr(x)
        return x
    return hashlib.sha256(json.dumps(walk(answer), sort_keys=True, default=str).encode()).hexdigest()


def one(sid, version, path):
    """One image in this process: {signature, seconds, peak_mb}, printed as JSON."""
    study = Study(sid)
    image = study.read(path)
    tracemalloc.start()
    t0 = time.perf_counter()
    a = study.run(version, image, lab_run.Services(study))
    secs = time.perf_counter() - t0
    peak = tracemalloc.get_traced_memory()[1] / 2 ** 20
    print(json.dumps(dict(signature=signature(a), seconds=round(secs, 3), peak_mb=round(peak, 1))))


def measure(study, version):
    out = {}
    for entry, _ in lab_run.corpus(study):
        r = subprocess.run([sys.executable, __file__, study.id, '_one', version, entry['local']],
                           capture_output=True, text=True, check=True)
        out[entry['sha256']] = dict(json.loads(r.stdout.strip().splitlines()[-1]), name=os.path.basename(entry['path']))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study')
    ap.add_argument('what', choices=['snapshot', 'check', 'profile', '_one'])
    ap.add_argument('version')
    ap.add_argument('path', nargs='?')
    a = ap.parse_args(argv)
    if a.what == '_one':
        return one(a.study, a.version, a.path)
    study = Study(a.study)
    record = os.path.join(study.data, 'perf', a.version + '.json')
    if a.what == 'profile':
        entry, _ = lab_run.corpus(study)[0]
        image = study.read(entry['local'])
        prof = cProfile.Profile()
        prof.runcall(study.run, a.version, image, lab_run.Services(study))
        pstats.Stats(prof).sort_stats('cumulative').print_stats(25)
        return
    now = measure(study, a.version)
    for sha, r in now.items():
        print(f'{r["name"]:50} {r["seconds"]:8.2f} s {r["peak_mb"]:8.1f} MB  {r["signature"][:12]}')
    if a.what == 'snapshot':
        os.makedirs(os.path.dirname(record), exist_ok=True)
        json.dump(now, open(record, 'w'), indent=1)
        print(f'recorded {record}')
        return
    was = json.load(open(record))
    changed = [now[s]['name'] for s in was if s in now and now[s]['signature'] != was[s]['signature']]
    for s in was:
        if s in now:
            print(f'{now[s]["name"]:50} {was[s]["seconds"]:8.2f} -> {now[s]["seconds"]:8.2f} s  '
                  f'{was[s]["peak_mb"]:8.1f} -> {now[s]["peak_mb"]:8.1f} MB')
    if changed:
        sys.exit(f'answers changed on: {", ".join(changed)}; the speed-up is not bit-identical')
    print('every answer bit-identical')


if __name__ == '__main__':
    main()
