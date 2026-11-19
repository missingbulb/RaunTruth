"""Versions compared item by item: which ground-truth items each one keeps, over every image with ground truth.

    python3 lab/items.py STUDY table [SPEC ...]        each version's tp and fp, the union's recall and the
                                                       intersection's precision, and the items one version alone keeps
    python3 lab/items.py STUDY ablate BASE VARIANT ... keep or drop each variant: a paired bootstrap of F1 over the items

A SPEC is a version with parameters, as its run takes them: `tl`, `tl:half=0.3,bend=20`, `tl:values={"min_snr":4}`.
It needs a study whose score returns `items`, one {id, label, hit} per graded ground-truth item (label 1 a real item,
0 a false one; hit whether the answer keeps it), beside its tp, fp and fn.
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'dev', 'tools', 'trick_pool'))
import mutation_signal as S
import run as lab_run
from study import Study


def parse(spec):
    """'tl:half=0.3,bend=20' -> ('tl', {'half': 0.3, 'bend': 20}); a value is JSON, and may hold commas inside brackets."""
    name, _, rest = spec.partition(':')
    params, depth, part = {}, 0, ''
    for ch in rest + ',':
        if ch == ',' and depth == 0:
            if part:
                k, v = part.split('=', 1)
                params[k] = json.loads(v)
            part = ''
            continue
        depth += (ch in '[{') - (ch in ']}')
        part += ch
    return name, params


class Corpus:
    """The study's images with ground truth, each read once, and its graded items in one order."""

    def __init__(self, study, which='all'):
        self.study, self.pairs, self.images = study, lab_run.corpus(study, which=which), {}
        self.code = lab_run.code_hash(study)

    def image(self, entry):
        if entry['sha256'] not in self.images:
            self.images[entry['sha256']] = self.study.read(entry['local'])
        return self.images[entry['sha256']]

    def answers(self, spec):
        name, params = parse(spec)
        return [lab_run.answer(self.study, name, e, params, self.code, self.images) for e, _ in self.pairs]

    def scored(self, answers):
        """Every image's items, one list: [{id, label, hit, image}]."""
        out = []
        for (e, t), a in zip(self.pairs, answers):
            out += [dict(it, image=os.path.basename(e['path'])) for it in self.study.score(a, t['doc'], e.get('damaged'))['items']]
        return out

    def hits(self, answers):
        return np.array([it['hit'] for it in self.scored(answers)], bool)

    def items(self):
        return self.scored(self.answers(self.study.versions[0]))


def table(hv, items):
    """Each version's tp and fp, the bounds no vote passes (the union's recall, the intersection's precision), and the
    graded items exactly one version keeps."""
    y = np.array([it['label'] for it in items])
    pr = lambda h: (int((h & (y == 1)).sum()), int((h & (y == 0)).sum()))
    for name, h in hv.items():
        tp, fp = pr(h)
        print(f"{name:24s} tp {tp:3d} fp {fp:3d}  P {tp / max(1, tp + fp):.2f} R {tp / max(1, (y == 1).sum()):.2f}")
    H = np.array(list(hv.values())); U, I = H.any(0), H.all(0)
    (tu, fu), (ti, fi) = pr(U), pr(I)
    print(f"{'union':24s} tp {tu:3d} fp {fu:3d}  R {tu / max(1, (y == 1).sum()):.2f}  (no OR vote recalls more)")
    print(f"{'intersection':24s} tp {ti:3d} fp {fi:3d}  P {ti / max(1, ti + fi):.2f}  (no AND vote is more precise)")
    ids = lambda m: [items[i]['id'] for i in np.nonzero(m)[0]]
    for j, name in enumerate(hv):
        only = H[j] & (H.sum(0) == 1)
        print(f"only {name:19s} real {ids(only & (y == 1))} false {ids(only & (y == 0))}")


def ablate(c, base, variants):
    """Keep or drop: each variant against the base, by a paired bootstrap of F1 over the graded items."""
    items = c.items(); y = np.array([it['label'] for it in items])
    hb = c.hits(c.answers(base))
    print(f"{'variant':36s}   tp  fp   F1    dF1  P(better) verdict")
    print(f"{base:36s} {(hb & (y == 1)).sum():4d} {(hb & (y == 0)).sum():3d}  {S.f1(hb, y):.3f}   base")
    for v in variants:
        hv = c.hits(c.answers(v)); p = S.p_better(hb, hv, y)
        print(f"{v:36s} {(hv & (y == 1)).sum():4d} {(hv & (y == 0)).sum():3d}  {S.f1(hv, y):.3f} {S.f1(hv, y) - S.f1(hb, y):+.3f}"
              f"  {p:5.2f}   {S.verdict(p)}", flush=True)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study')
    ap.add_argument('cmd', choices=['table', 'ablate'])
    ap.add_argument('specs', nargs='*')
    ap.add_argument('--truth', choices=['all', 'drive', 'lab'], default='all')
    a = ap.parse_args(argv)
    c = Corpus(Study(a.study), a.truth)
    if a.cmd == 'table':
        specs = a.specs or c.study.versions
        return table({s: c.hits(c.answers(s)) for s in specs}, c.items())
    ablate(c, a.specs[0], a.specs[1:])


if __name__ == '__main__':
    main()
