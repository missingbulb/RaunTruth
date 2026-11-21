"""Reading a book's title from its straightened crop: the lines of text found, each read at the turns the book's
shape allows, the likeliest reading kept, and its Hebrew words set right by a word list. The engines themselves are
the environment's, asked for as services: `det` (PaddleOCR's text finder over a tensor, its probability per pixel),
`tesseract` (Tesseract's reading of an image, and its certainty) and `words` (the word list). A crop is an RGBA
uint8 array, rows by columns.

Two readers:
  tesseract   Tesseract on the whole crop, at each turn the book's shape allows
  lines       PaddleOCR's text finder marks the lines of text, then Tesseract reads each line
"""
import math
import re

import numpy as np
from scipy import ndimage as ndi

READERS = {'tesseract': 'Tesseract', 'lines': 'Paddle lines + Tesseract'}
# the languages a book may be read in, by Tesseract's names
LANGS = {'both': ['heb', 'eng'], 'heb': ['heb'], 'eng': ['eng']}
# PaddleOCR's text finder, as its trainers normalised its input: blue, green, red, channel by channel
DET_MEAN, DET_STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)
# a pixel is text above this probability, and a line is kept when its mean is above LINE_SURE
TEXT_ON, LINE_SURE = 0.3, 0.6
# the finder marks a line's core; it is grown back by its area over its perimeter, times this
GROW = 1.5
# the longest side the finder reads a crop at
DET_LONG = 960


def rotate(im, k):
    """k quarter turns clockwise."""
    return np.ascontiguousarray(np.rot90(im, -(k % 4)))


def turns(im):
    """The turns at which a crop's text may read across: a tall crop's runs up or down its length, a wide one's
    across it or upside down."""
    return [1, 3] if im.shape[0] > im.shape[1] else [0, 2]


def js_round(x):
    """Rounded as the page rounds (Math.round): halves up."""
    return math.floor(x + 0.5)


def tidy(t):
    return re.sub(r'\s+', ' ', t).strip()


def best(tries):
    out = tries[0]
    for t in tries[1:]:
        if t['confidence'] > out['confidence']:
            out = t
    return out


def det_tensor(im, W, H):
    """The finder's input: im sampled at W x H by nearest pixel centre, blue, green, red, normalised."""
    h, w = im.shape[:2]
    sx = np.minimum(w - 1, np.floor((np.arange(W) + 0.5) * w / W).astype(int))
    sy = np.minimum(h - 1, np.floor((np.arange(H) + 0.5) * h / H).astype(int))
    px = im[sy][:, sx, :3].astype(np.float32) / 255
    bgr = px[..., ::-1]
    x = (bgr - np.array(DET_MEAN, np.float32)) / np.array(DET_STD, np.float32)
    return np.ascontiguousarray(x.transpose(2, 0, 1)[None], np.float32)


def text_map(view):
    """The text finder's probability per pixel over the photo's view (books.text_view), in steps of 1/255, the map
    the finders take; None when the environment has no text finder to run."""
    H, W = view.shape[:2]
    prob = yield ('det', det_tensor(view, W, H))
    if prob is None:
        return None
    return np.floor(np.clip(np.asarray(prob, np.float64).reshape(H, W), 0, 1) * 255 + 0.5) / 255


def lines(im):
    """The lines of text in a crop turned so its text reads across, as boxes (x0, y0, x1, y1) in its pixels, top
    first."""
    h, w = im.shape[:2]
    s = min(1, DET_LONG / max(w, h))
    W, H = max(32, js_round(w * s / 32) * 32), max(32, js_round(h * s / 32) * 32)
    prob = yield ('det', det_tensor(im, W, H))
    if prob is None:
        return []
    # compared as the page compares: its float32 output read as doubles
    prob = np.asarray(prob, np.float32).reshape(H, W).astype(np.float64)
    on = prob > TEXT_ON
    lab, n = ndi.label(on)
    boxes = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        mask = lab[sl] == i + 1
        if prob[sl][mask].mean() < LINE_SURE:
            continue
        y0, x0, y1, x1 = sl[0].start, sl[1].start, sl[0].stop - 1, sl[1].stop - 1
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if min(bw, bh) < 3:
            continue
        d = bw * bh * GROW / (2 * (bw + bh))
        fx, fy = w / W, h / H
        boxes.append((max(0, math.floor((x0 - d) * fx)), max(0, math.floor((y0 - d) * fy)),
                      min(w, math.ceil((x1 + 1 + d) * fx)), min(h, math.ceil((y1 + 1 + d) * fy))))
    return sorted(boxes, key=lambda b: (b[1], b[0]))


def tesseract_at(im, turn, lang):
    r = yield ('tesseract', rotate(im, turn), LANGS[lang])
    return dict(text=tidy(r['text']), confidence=r['confidence'] / 100, turn=turn)


def by_lines(im, lang, at):
    found = []
    for turn in at or turns(im):
        up, parts = rotate(im, turn), []
        for x0, y0, x1, y1 in (yield from lines(up)):
            line = up[y0:y1, x0:x1]
            tries = []
            for t in ([0] if at else [0, 2]):
                r = yield from tesseract_at(line, t, lang)
                tries.append(dict(text=r['text'], confidence=r['confidence'], t=t))
            parts.append(dict(best(tries), box=(x0, y0, x1, y1)))
        chars = sum(len(p['text']) for p in parts)
        size = (up.shape[1], up.shape[0])
        found.append(dict(text=tidy(' '.join(p['text'] for p in parts)), turn=turn, lines=len(parts),
                          confidence=sum(p['confidence'] * len(p['text']) for p in parts) / chars if chars else 0,
                          blocks=[dict(text=p['text'], box=p['box'], size=size, turn=turn) for p in parts]))
    return best(found)


def read(im, how, spell, turn=None, lang='both'):
    """The crop's text by one reader: {text, confidence (0 to 1), turn (quarter turns clockwise that set it
    upright), blocks (each line read, for fields.label)}, its Hebrew words spelled by spell; given a turn, read
    upright at that turn alone."""
    at = None if turn is None else [turn]
    if how == 'tesseract':
        tries = []
        for t in at or turns(im):
            tries.append((yield from tesseract_at(im, t, lang)))
        r = best(tries)
        h, w = im.shape[:2]
        size = (h, w) if r['turn'] % 2 else (w, h)
        r = dict(r, blocks=[dict(text=r['text'], box=(0, 0) + size, size=size, turn=r['turn'])])
    elif how == 'lines':
        r = yield from by_lines(im, lang, at)
    else:
        raise ValueError(f'no reader {how!r}')
    return dict(r, text=spell(r['text']), blocks=[dict(b, text=spell(b['text'])) for b in r['blocks']])


# Hebrew letters print makes look alike, each set a reader confuses one for another; and the letters a word may be
# prefixed with
LOOK_ALIKE = ['בכנ', 'דרך', 'החת', 'וזןי', 'סםט', 'גנ', 'עצ']
PREFIXES = 'והבכלמש'
# ו and י, the letters full spelling adds and defective spelling leaves out
MATRES = 'וי'
# the fewest letters of a word a run is parted into
SPLIT = 3
HEBREW = re.compile('^[א-ת]+$')


def spelling(text_list):
    """A reading's Hebrew words set right by a word list, most frequent first, a word to a line: a word of three
    letters or more that is not on it, even with one or two prefix letters off, becomes the most frequent listed word
    one look-alike letter, or one ו or י more or fewer, away, or stays as read; a final letter read inside a run of
    letters ends a word there, and a run no word fits is parted into the likeliest listed words, each of SPLIT
    letters or more."""
    rank = {}
    for line in text_list.split('\n'):
        w = line.split(' ')[0]
        if HEBREW.match(w) and w not in rank:
            rank[w] = len(rank)

    def listed(w):
        if w in rank:
            return 1 / (1 + rank[w])
        for k in (1, 2):
            rest = w[k:]
            if len(rest) > 1 and all(c in PREFIXES for c in w[:k]) and rest in rank:
                return 0.1 / (1 + rank[rest])
        return 0

    def alike(c):
        return ''.join(g for g in LOOK_ALIKE if c in g).replace(c, '')

    def word(w):
        if len(w) < 3 or listed(w):
            return w
        near = []
        for i in range(len(w)):
            for c in alike(w[i]):
                near.append(w[:i] + c + w[i + 1:])
        for i in range(1, len(w)):
            for c in MATRES:
                near.append(w[:i] + c + w[i:])
            if w[i] in MATRES:
                near.append(w[:i] + w[i + 1:])
        to, most = w, 0
        for v in near:
            f = listed(v)
            if f > most:
                to, most = v, f
        return to

    def parts(w):
        if len(w) < 2 * SPLIT or listed(word(w)):
            return [w]
        bestp = [(0, -1)]
        for j in range(1, len(w) + 1):
            bestp.append((-math.inf, -1))
            for i in range(max(0, j - 16), j - SPLIT + 1):
                f = listed(w[i:j])
                p = bestp[i][0] + math.log(f) if f else -math.inf
                if f and p > bestp[j][0]:
                    bestp[j] = (p, i)
        if bestp[len(w)][0] == -math.inf:
            return [w]
        out, j = [], len(w)
        while j > 0:
            i = bestp[j][1]
            out.insert(0, w[i:j])
            j = i
        return out

    def run(m):
        pieces = re.split('(?<=[ךםןףץ])(?=[א-ת])', m.group(0))
        return ' '.join(word(p) for piece in pieces for p in parts(piece))

    return lambda text: re.sub('[א-ת]+', run, text)
