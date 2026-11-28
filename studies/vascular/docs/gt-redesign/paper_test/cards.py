"""The paper test's cards: junctions and vessel widths cut from a real stack and its model, as cards.json for the
test page (build_page.py). A junction card is the flattened stack around it, each arm's depth written at its end,
and the same crop coloured by depth; a width card is the vessel straightened from the slices at its depth, its
brightness across it, and the vessel whole in its surroundings.

    python3 cards.py STACK.tif MODEL.json OUT.json [--junctions 20] [--vessels 30] [--seed 1]
"""
import argparse, base64, colorsys, io, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'algorithm'))
import vascular  # noqa: E402

# the crop around a junction, µm each way from it; the card's picture, screen px
J_HALF_UM, CARD_PX = 22.0, 320
# across a vessel: µm each way from its line, and at least this many of its own widths
STRIP_UM, STRIP_WIDTHS = 6.0, 3.0
# the profile is averaged over the vessel's middle share
MIDDLE = 0.6


def font(size):
    try:
        return ImageFont.truetype('DejaVuSans.ttf', size)
    except OSError:
        return ImageFont.load_default()


def url(img):
    b = io.BytesIO(); img.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def stretch(a, lo, hi):
    return np.clip((a - lo) / (hi - lo), 0, 1)


def curve(model, e):
    N = {n['id']: n for n in model['nodes']}
    return [N[e['a']]] + e.get('via', []) + [N[e['b']]]


def resample(pts, step_um):
    p = np.array([[q['x'], q['y'], q.get('z', 0)] for q in pts], float)
    s = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p[:, :2], axis=0).T))])
    t = np.arange(0, s[-1] + 1e-9, step_um) if s[-1] > step_um else np.array([0, s[-1]])
    return np.stack([np.interp(t, s, p[:, k]) for k in range(3)], 1), s[-1]


def junction_items(model):
    """Each junction of three or more confirmed vessels, those joined by a vessel shorter than two widths merged
    into one item: a crossing the algorithm made into two junctions is asked about once."""
    live = [e for e in model['edges'] if e['state'] in ('vessel', 'accepted')]
    deg = {}
    for e in live:
        for k in (e['a'], e['b']):
            deg[k] = deg.get(k, 0) + 1
    J = {k for k, d in deg.items() if d >= 3}
    parent = {k: k for k in J}
    def find(k):
        while parent[k] != k: k = parent[k]
        return k
    for e in live:
        if e['a'] in J and e['b'] in J:
            _, L = resample(curve(model, e), 0.5)
            w = (e.get('r_a') or 1.5) + (e.get('r_b') or 1.5)
            if L < 2 * w:
                parent[find(e['a'])] = find(e['b'])
    groups = {}
    for k in J:
        groups.setdefault(find(k), []).append(k)
    out = []
    for nodes in groups.values():
        arms = [e for e in live if (e['a'] in nodes) != (e['b'] in nodes)]
        out.append({'nodes': nodes, 'arms': arms})
    return out


def junction_card(vol, flat, lohi, depth_rgb, model, item, um):
    N = {n['id']: n for n in model['nodes']}
    cx = np.mean([N[k]['x'] for k in item['nodes']]); cy = np.mean([N[k]['y'] for k in item['nodes']])
    h = J_HALF_UM / um
    x0, y0 = int(round(cx / um - h)), int(round(cy / um - h)); n = int(round(2 * h))
    sl = (slice(max(y0, 0), y0 + n), slice(max(x0, 0), x0 + n))
    k = CARD_PX / n
    P = lambda x, y: ((x / um - x0) * k, (y / um - y0) * k)
    grey = Image.fromarray((stretch(flat[sl], *lohi) * 255).astype('uint8')).resize((CARD_PX, CARD_PX), Image.BILINEAR).convert('RGB')
    colour = Image.fromarray(depth_rgb[sl]).resize((CARD_PX, CARD_PX), Image.BILINEAR)
    arms = []
    for e in item['arms']:
        pts, L = resample(curve(model, e), 0.5)
        if e['a'] not in item['nodes']: pts = pts[::-1]
        # the arm's depth: the mean over its first 8 µm away from the junction; its label where it leaves the crop
        near = pts[: max(2, int(8 / 0.5))]
        z = float(near[:, 2].mean())
        inside = [q for q in pts if abs(q[0] / um - cx / um) < h * 0.82 and abs(q[1] / um - cy / um) < h * 0.82]
        end = inside[-1] if inside else pts[min(len(pts) - 1, 8)]
        arms.append({'z_um': round(z * model['z_step_um'], 1), 'at': P(end[0], end[1]), 'path': [P(q[0], q[1]) for q in pts[: len(inside) + 1]]})
    def draw(img, lines):
        d = ImageDraw.Draw(img, 'RGBA'); f = font(15)
        if lines:
            for a in arms: d.line(a['path'], fill=(80, 220, 120, 150), width=1)
        for a in arms:
            t = f"{a['z_um']:.0f} µm"; x, y = a['at']; x = min(max(x, 4), CARD_PX - 54); y = min(max(y, 4), CARD_PX - 20)
            d.rectangle([x - 2, y - 1, x + 50, y + 18], fill=(0, 0, 0, 170)); d.text((x, y), t, fill=(255, 255, 255), font=f)
        X, Y = P(cx, cy); d.ellipse([X - 14, Y - 14, X + 14, Y + 14], outline=(61, 220, 132), width=2)
        return img
    return {'kind': 'junction', 'nodes': item['nodes'], 'merged': len(item['nodes']) > 1, 'arms': len(arms),
            'spread_um': round(max(a['z_um'] for a in arms) - min(a['z_um'] for a in arms), 1),
            'grey': url(draw(grey.copy(), True)), 'bare': url(draw(grey.copy(), False)), 'depth': url(draw(colour, False))}


def width_card(vol, flat, lohi, model, e, um, rng):
    pts, L = resample(curve(model, e), 0.25)
    est = float((e.get('r_a') or 1.5) + (e.get('r_b') or 1.5))
    half = max(STRIP_UM, STRIP_WIDTHS * est / 2)
    off = np.arange(-half, half + 1e-9, 0.25)
    t = np.gradient(pts[:, :2], axis=0); t /= np.hypot(*t.T)[:, None] + 1e-9; nrm = np.stack([-t[:, 1], t[:, 0]], 1)
    xs = (pts[None, :, 0] + off[:, None] * nrm[None, :, 0]) / um; ys = (pts[None, :, 1] + off[:, None] * nrm[None, :, 1]) / um
    zs = np.clip(np.round(pts[:, 2]).astype(int), 0, vol.shape[0] - 1)
    # each column sampled in the slices at the vessel's own depth, one either side, averaged
    strip = np.zeros(xs.shape)
    for dz in (-1, 0, 1):
        z = np.clip(zs + dz, 0, vol.shape[0] - 1)
        strip += ndi.map_coordinates(vol, [np.broadcast_to(z, xs.shape), ys, xs], order=1) / 3
    a, b = int(len(pts) * (1 - MIDDLE) / 2), int(len(pts) * (1 + MIDDLE) / 2) + 1
    prof = strip[:, a:b].mean(1)
    base, top = np.percentile(prof, 5), prof[len(off) // 2 - 4: len(off) // 2 + 5].max()
    hm = base + (top - base) / 2
    c = len(off) // 2; i = c
    while i > 0 and prof[i] >= hm: i -= 1
    j = c
    while j < len(off) - 1 and prof[j] >= hm: j += 1
    def cross(k0, k1):
        return off[k0] + (hm - prof[k0]) / (prof[k1] - prof[k0] + 1e-9) * (off[k1] - off[k0])
    left, right = cross(i, i + 1), cross(j, j - 1)
    # true to scale across and along, within readable bounds
    sh = int(np.clip(2 * CARD_PX * 2 * half / max(L, 1e-6), 48, 200))
    S = Image.fromarray((stretch(strip, *np.percentile(strip, [1, 99.7])) * 255).astype('uint8')).resize((2 * CARD_PX, sh), Image.BILINEAR)
    # the vessel whole, in its surroundings
    xy = pts[:, :2] / um; pad = 25 / um
    x0, y0 = int(xy[:, 0].min() - pad), int(xy[:, 1].min() - pad); side = int(max(np.ptp(xy[:, 0]), np.ptp(xy[:, 1])) + 2 * pad)
    x0, y0 = max(x0, 0), max(y0, 0)
    ctx = Image.fromarray((stretch(flat[y0:y0 + side, x0:x0 + side], *lohi) * 255).astype('uint8')).resize((CARD_PX, CARD_PX), Image.BILINEAR).convert('RGB')
    k = CARD_PX / side; d = ImageDraw.Draw(ctx, 'RGBA')
    d.line([((x - x0) * k, (y - y0) * k) for x, y in xy], fill=(61, 220, 132, 200), width=3)
    return {'kind': 'width', 'edge': e['id'], 'length_um': round(float(L), 1), 'estimate_um': round(est, 2),
            'measured_um': round(float(right - left), 2), 'edges_um': [round(float(left), 2), round(float(right), 2)],
            'offsets_um': [round(float(o), 2) for o in off], 'profile': [round(float(v), 1) for v in prof], 'half': round(float(hm), 1),
            'strip': url(S), 'context': url(ctx), 'depth_um': round(float(pts[:, 2].mean() * model['z_step_um']), 1)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('stack'); ap.add_argument('model'); ap.add_argument('out')
    ap.add_argument('--junctions', type=int, default=20); ap.add_argument('--vessels', type=int, default=30); ap.add_argument('--seed', type=int, default=1)
    a = ap.parse_args()
    im = vascular.read(a.stack); vol = im['cd31'].astype(np.float32); um = im['um']
    model = json.load(open(a.model)); rng = np.random.default_rng(a.seed)
    flat = vol.max(0); lohi = tuple(np.percentile(flat, [1, 99.7]))
    zi = vol.argmax(0); val = stretch(flat, *lohi)
    hue = 0.75 * zi / max(vol.shape[0] - 1, 1)
    depth_rgb = (np.stack(np.vectorize(colorsys.hsv_to_rgb)(hue, np.ones_like(hue), val), -1) * 255).astype('uint8')
    items = junction_items(model)
    border = lambda x, y: min(x, y, model['size_px'][0] * um - x, model['size_px'][1] * um - y) > J_HALF_UM
    N = {n['id']: n for n in model['nodes']}
    items = [it for it in items if border(N[it['nodes'][0]]['x'], N[it['nodes'][0]]['y'])]
    # half the junctions drawn at random, half the merged ones and those whose arms differ most in depth: the hard
    # cases the card exists for
    rng.shuffle(items)
    def spread(it):
        zs = [np.mean([p.get('z', 0) for p in curve(model, e)[:4]]) for e in it['arms']]
        return (len(it['nodes']) > 1, np.ptp(zs))
    hard = sorted(items, key=spread, reverse=True)[: a.junctions // 2]
    rest = [it for it in items if it not in hard][: a.junctions - len(hard)]
    chosen = hard + rest; rng.shuffle(chosen)
    cards = [junction_card(vol, flat, lohi, depth_rgb, model, it, um) for it in chosen]
    live = [e for e in model['edges'] if e['state'] in ('vessel', 'accepted')]
    live = [e for e in live if 15 < resample(curve(model, e), 0.5)[1] and all(border(p['x'], p['y']) for p in curve(model, e)[::3])]
    for e in rng.choice(live, size=min(a.vessels, len(live)), replace=False):
        cards.append(width_card(vol, flat, lohi, model, e, um, rng))
    json.dump({'stack': im['name'], 'algorithm': model.get('algorithm'), 'cards': cards}, open(a.out, 'w'))
    print(len(cards), 'cards', sum(c['kind'] == 'junction' and c['merged'] for c in cards), 'merged junctions', os.path.getsize(a.out) // 1024, 'KB')


if __name__ == '__main__':
    main()
