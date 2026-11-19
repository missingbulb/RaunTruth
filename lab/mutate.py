"""The mutation sweep: tricks from the repo's trick pool (dev/tools/trick_pool) spliced into a study's version, each
mutant scored item by item against ground truth, and any sign of good reported above a chance bar.

    python3 lab/mutate.py STUDY list                                  every runnable trick, and what is missing here
    python3 lab/mutate.py STUDY sweep [--base SPEC] [--kinds pre,verify] [--tricks a,b] [--out DIR]
    python3 lab/mutate.py STUDY one MUTATION [--base SPEC] [--out DIR]
    python3 lab/mutate.py STUDY view raw white-tophat ... [--out DIR]   gridded tiles of each view, for a vision agent
    python3 lab/mutate.py STUDY marks DIR/VIEW/marks.json --tiles DIR/tiles.json

A mutation is one of:
  pre:<trick>@<plane>[+<plane>]   the trick transforms planes of the image before the version runs
  verify:<trick>@<plane>:reject   the trick's map is handed to the study's `verify` stage, which fails the passes that
                                  sit lowest on it (the bottom decile of the passes' own values)
  verify:<trick>@<plane>:rescue   ... and passes the failed items at or above the passes' 90th percentile

What it needs of the study beyond the contract (lab/README.md): an image that is a dict, whose planes are the 2-D
arrays it holds (`PLANES` names those a trick may change, drawn red, green, blue in that order); a `score` that
returns `items` (lab/items.py); for verify, a `verify` stage, stage(image, answer, map, mode, q); an answer's `unit`
(the size the tricks scale by) when it has one. The signal (what a mutant does that no version does) is the pool's
mutation_signal module; the mutating-an-algorithm skill says how to read it. Records go to the study's data/raw/mutate/:
sweep.json, and a sheet per flagged mutant, <mutation with : and @ as _>.png.
"""
import argparse
import json
import os
import sys
import time

import numpy as np
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import items as I
from items import S
from study import Study

sys.path.insert(0, os.path.join(HERE, '..', 'dev', 'tools', 'trick_pool'))
import tricks as T

REJECT_Q, RESCUE_Q = 0.10, 0.90
NULLS = 8
TILE, ZOOM, GRID = 160, 3, 20
# an agent's mark within this many pixels of an item is on it
MARK_PX = 5


def planes(study, image):
    return list(getattr(study.module, 'PLANES', [k for k, v in image.items() if getattr(v, 'ndim', 0) == 2 and v.dtype.kind == 'f']))


def parse(m):
    """'verify:unsharp-mask(r_u=1.5)@nav:reject=0.2' -> ('verify', 'unsharp-mask', ['nav'], 'reject', {'r_u': 1.5}, 0.2)"""
    kind, rest = m.split(':', 1)
    tid, _, tail = rest.partition('@')
    tid, _, args = tid.partition('(')
    kw = {k: json.loads(v) for k, v in (a.split('=') for a in filter(None, args.rstrip(')').split(',')))}
    chan, _, mode = tail.partition(':')
    mode, _, q = mode.partition('=')
    return kind, tid, chan.split('+'), mode or None, kw, float(q) if q else None


def null_trick(tid, kind):
    """'null-<seed>': what an idea-free change does in the same slot. For verify, a random map. For pre, a perturbation
    as strong as a real trick: a blur of random width and a smooth random illumination field."""
    seed = int(tid.split('-')[1])

    def fn(img, unit):
        rng = np.random.default_rng(seed)
        if kind != 'pre':
            return rng.random(img.shape)
        field = ndi.gaussian_filter(rng.normal(0, 1, img.shape), 8 * unit)
        field = 1 + 0.5 * field / max(np.abs(field).max(), 1e-12)
        return ndi.gaussian_filter(img, rng.uniform(0.2, 0.8) * unit) * field
    return fn


def trick_fn(tid, kind):
    return null_trick(tid, kind) if tid.startswith('null-') else T.TRICKS[tid]


def mutant(c, m, base):
    """The mutant's answer on every image of the corpus."""
    kind, tid, chans, mode, kw, q = parse(m)
    fn0 = trick_fn(tid, kind)
    name, params = I.parse(base)
    out = []
    for (e, _), a in zip(c.pairs, c.answers(base)):
        image, unit = c.image(e), a.get('unit') or 1.0
        fn = lambda img: fn0(img, unit, **kw)
        if kind == 'pre':
            changed = dict(image, **{k: np.maximum(fn(image[k]), 0) for k in chans})
            out.append(c.study.run(name, changed, damaged=e.get('damaged'), **params))
        else:
            M = fn(sum(image[k] for k in chans))
            out.append(c.study.stage('verify', image, a, map=M, mode=mode,
                                     q=q or (REJECT_Q if mode == 'reject' else RESCUE_Q)))
    return out


def mutations(kinds, chans, only=None, nulls=False):
    av = T.available(); out = []
    ids = [f'null-{i}' for i in range(NULLS)] if nulls else [t for t in T.KIND if not av[t] and (not only or t in only)]
    for tid in ids:
        if 'pre' in kinds and (nulls or T.KIND[tid] == 'pre'):
            out += [f'pre:{tid}@{ch}' for ch in chans + ['+'.join(chans)]]
        if 'verify' in kinds:
            out += [f'verify:{tid}@{ch}:{mo}' for ch in chans for mo in ('reject', 'rescue')]
    return out


def rgb(study, image, chans, unit, trick=None):
    """The image's planes drawn red, green, blue, each stretched between its 0.5% and 99.8% quantiles."""
    H, W = image[chans[0]].shape
    out = np.zeros((H, W, 3), np.uint8)
    for j, k in enumerate(chans[:3]):
        p = np.maximum(T.TRICKS[trick](image[k], unit), 0) if trick else image[k]
        lo, hi = np.quantile(p, 0.005), np.quantile(p, 0.998)
        out[..., j] = (np.clip((p - lo) / max(hi - lo, 1e-12), 0, 1) * 255).astype(np.uint8)
    return out


def tile_origins(items, registry, n=6):
    """Tiles over the hard part first: real items no version finds, then false ones every version keeps, then plain
    successes; each tile is placed once and holds whatever other items fall inside it."""
    R = np.array(list(registry.values())); y = np.array([L['label'] for L in items])
    order = list(np.nonzero((y == 1) & ~R.any(0))[0]) + list(np.nonzero((y == 0) & R.all(0))[0]) + list(np.nonzero((y == 1) & R.all(0))[0])
    out = []
    for i in order:
        x0, y0 = int(items[i]['x']) - TILE // 2, int(items[i]['y']) - TILE // 2
        if all(abs(x0 - a) > TILE // 2 or abs(y0 - b) > TILE // 2 for a, b in out):
            out.append((x0, y0))
        if len(out) == n:
            break
    return out


def view(c, names, items, registry, out):
    """Gridded tiles of the first image with ground truth, raw and through each trick, for a vision agent to mark."""
    from PIL import Image, ImageDraw
    e = c.pairs[0][0]; image = c.image(e); chans = planes(c.study, image)
    unit = c.answers(c.study.versions[0])[0].get('unit') or 1.0
    first = [it for it in items if it['image'] == os.path.basename(e['path'])]
    H, W = image[chans[0]].shape
    origins = [(min(max(0, x0), W - TILE), min(max(0, y0), H - TILE))
               for x0, y0 in tile_origins(first, {k: v[:len(first)] for k, v in registry.items()})]
    json.dump(dict(tile=TILE, zoom=ZOOM, grid=GRID, origins=origins, image=e['path']), open(os.path.join(out, 'tiles.json'), 'w'))
    for name in names:
        pic = rgb(c.study, image, chans, unit, None if name == 'raw' else name)
        d = os.path.join(out, name); os.makedirs(d, exist_ok=True)
        for t, (x0, y0) in enumerate(origins):
            im = Image.fromarray(pic[y0:y0 + TILE, x0:x0 + TILE]).resize((TILE * ZOOM, TILE * ZOOM), Image.NEAREST)
            dr = ImageDraw.Draw(im)
            for g in range(0, TILE, GRID):
                dr.line([(g * ZOOM, 0), (g * ZOOM, TILE * ZOOM)], fill=(90, 90, 160)); dr.line([(0, g * ZOOM), (TILE * ZOOM, g * ZOOM)], fill=(90, 90, 160))
                dr.text((g * ZOOM + 2, 2), str(g), fill=(200, 200, 255)); dr.text((2, g * ZOOM + 2), str(g), fill=(200, 200, 255))
            im.save(os.path.join(d, f'tile_{t}.png'))
        print(f'{name}: {len(origins)} tiles -> {d}')


def marks(path, tiles, items, registry):
    """An agent's marks on the tiles, scored against the graded items inside the tiles, beside every version."""
    tj = json.load(open(tiles)); M = json.load(open(path))['marks']
    xy = [(tj['origins'][m['tile']][0] + m['x'], tj['origins'][m['tile']][1] + m['y']) for m in M if m.get('sure', 1) >= 0.5]
    name = os.path.basename(tj['image'])
    inside = [i for i, L in enumerate(items) if L['image'] == name and
              any(x0 <= L['x'] < x0 + tj['tile'] and y0 <= L['y'] < y0 + tj['tile'] for x0, y0 in tj['origins'])]
    sub = [items[i] for i in inside]; y = np.array([L['label'] for L in sub])
    h = S.hits(xy, sub, lambda L: MARK_PX)
    print(f"marks {len(xy)} | in tiles: {int((y == 1).sum())} real, {int((y == 0).sum())} false | agent tp {int((h & (y == 1)).sum())} fp {int((h & (y == 0)).sum())}")
    for v, hr in registry.items():
        hr = hr[inside]
        print(f"  vs {v:8s} tp {int((hr & (y == 1)).sum())} fp {int((hr & (y == 0)).sum())} | agent finds {int((h & ~hr & (y == 1)).sum())} real it misses, "
              f"rejects {int((~h & hr & (y == 0)).sum())} false it keeps")


def sheet(c, m, items, s, out, S_=24, Z=4, cols=8):
    """The items behind a signal as tiles of the image around each: what it rescued (+), what it rejected (x), and
    the real items the base found and it lost (-)."""
    from PIL import Image, ImageDraw
    pics, tiles = {}, []
    for key, tag in (('rescued_never', '+'), ('rejected_always', 'x'), ('lost_real', '-')):
        for i in s[key]:
            L = items[i]
            e = next(e for e, _ in c.pairs if os.path.basename(e['path']) == L['image'])
            if L['image'] not in pics:
                image = c.image(e); pics[L['image']] = rgb(c.study, image, planes(c.study, image), 1.0)
            pic = pics[L['image']]; H, W = pic.shape[:2]
            x0, y0 = min(max(0, int(L['x']) - S_ // 2), W - S_), min(max(0, int(L['y']) - S_ // 2), H - S_)
            tiles.append((Image.fromarray(pic[y0:y0 + S_, x0:x0 + S_]).resize((S_ * Z, S_ * Z), Image.NEAREST), f"{tag}{L['id']}"))
    if not tiles:
        return
    w = S_ * Z + 2; im = Image.new('RGB', (cols * w, ((len(tiles) + cols - 1) // cols) * w + 18), (50, 50, 50)); d = ImageDraw.Draw(im)
    d.text((4, 2), f'{m}: + never found before, x always kept before, - real the base found and this lost', fill=(255, 255, 255))
    for k, (t, label) in enumerate(tiles):
        X, Y = (k % cols) * w, 18 + (k // cols) * w
        im.paste(t, (X, Y)); d.text((X + 2, Y + 1), label, fill=(255, 255, 0))
    im.save(os.path.join(out, m.replace(':', '_').replace('@', '_') + '.png'))


def sweep(c, a, items, registry):
    y = np.array([it['label'] for it in items])
    hb = c.hits(c.answers(a.base))
    chans = planes(c.study, c.image(c.pairs[0][0]))
    kinds = a.kinds.split(',')
    ms = a.specs if a.cmd == 'one' else mutations(kinds, chans, a.tricks and set(a.tricks.split(',')))
    print(f"base {a.base}: tp {(hb & (y == 1)).sum()} fp {(hb & (y == 0)).sum()} | registry {', '.join(registry)} | "
          f"never found by any: {((y == 1) & ~np.array(list(registry.values())).any(0)).sum()} real | "
          f"kept by all: {((y == 0) & np.array(list(registry.values())).all(0)).sum()} false | "
          f"not runnable here: {', '.join(t for t, miss in T.available().items() if miss) or 'none'}")
    os.makedirs(a.out, exist_ok=True); rows = []
    last = os.path.join(a.out, 'sweep.json'); bar = {}
    slot = lambda m: (parse(m)[0], '+'.join(parse(m)[2]), parse(m)[3] or '')
    if a.cmd == 'one':
        bar = {tuple(k.split('|')): tuple(v) for k, v in (json.load(open(last)).get('chance', {}) if os.path.exists(last) else {}).items()}
        print(f'chance bar from the last sweep in {a.out}' if bar else 'no chance bar: run a sweep first, so its nulls are in --out')
    else:
        null = {}
        for m in mutations(kinds, chans, nulls=True):
            s = S.signal(y, registry, hb, c.hits(mutant(c, m, a.base)))
            null.setdefault(slot(m), []).append((len(s['rescued_never']), len(s['rejected_always'])))
        bar = {k: (max(v[0] for v in vs), max(v[1] for v in vs)) for k, vs in null.items()}
        print(f'chance (most of {NULLS} null mutants, never+ / always-): ' + ', '.join(f"{k[0]}@{k[1]}{':' + k[2] if k[2] else ''} {b[0]}/{b[1]}" for k, b in bar.items()))
    print(f"{'mutation':46s}  tp  fp  dtp dfp  P(better) never+ always-  secs")
    for m in ms:
        t = time.time()
        try:
            hm = c.hits(mutant(c, m, a.base))
        except Exception as e:  # a trick that breaks on these images is a result too: report it and go on
            print(f"{m:46s}  error: {type(e).__name__}: {str(e)[:60]}"); rows.append(dict(mutation=m, error=repr(e))); continue
        s = S.signal(y, registry, hb, hm, bar.get(slot(m)) if bar else None)
        s['mutation'] = m; s['secs'] = round(time.time() - t, 1)
        s['items'] = {k: [items[i]['id'] for i in s[k]] for k in ('rescued_never', 'rejected_always', 'lost_real')}
        rows.append(s)
        print(f"{m:46s} {s['tp']:3d} {s['fp']:3d} {s['d_tp']:+4d} {s['d_fp']:+3d}   {s['p_better']:.2f}    "
              f"{len(s['rescued_never']):3d}    {len(s['rejected_always']):3d}   {s['secs']:4.0f}{'  <- signal' if s['signal'] else ''}", flush=True)
        if s['signal']:
            sheet(c, m, items, s, a.out)
    chance = {'|'.join(k): v for k, v in bar.items()} if a.cmd == 'sweep' else {}
    json.dump(dict(base=a.base, chance=chance, rows=rows), open(last if a.cmd == 'sweep' else os.path.join(a.out, 'one.json'), 'w'),
              indent=1, default=str)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study'); ap.add_argument('cmd', choices=['list', 'sweep', 'one', 'view', 'marks']); ap.add_argument('specs', nargs='*')
    ap.add_argument('--base'); ap.add_argument('--kinds', default='pre,verify'); ap.add_argument('--tricks')
    ap.add_argument('--out'); ap.add_argument('--tiles'); ap.add_argument('--truth', choices=['all', 'drive', 'lab'], default='all')
    a = ap.parse_args(argv)
    if a.cmd == 'list':
        for tid, miss in sorted(T.available().items()):
            print(f"{T.KIND[tid]:4s} {tid:30s} {'ok' if not miss else 'missing ' + miss}")
        return
    study = Study(a.study)
    a.base = a.base or study.versions[0]
    a.out = a.out or os.path.join(study.data, 'mutate')
    c = I.Corpus(study, a.truth)
    items = c.items()
    registry = {v: c.hits(c.answers(v)) for v in study.versions}
    if a.cmd in ('view', 'marks'):
        os.makedirs(a.out, exist_ok=True)
        return view(c, a.specs, items, registry, a.out) if a.cmd == 'view' else marks(a.specs[0], a.tiles, items, registry)
    sweep(c, a, items, registry)


if __name__ == '__main__':
    main()
