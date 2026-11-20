"""The Bookshelf Reader's algorithm, as the page and the lab both run it (lab/README.md): a photo of shelves opened,
and in one go every book on it boxed and its title read. Any single 2D image Pillow opens: JPEG, PNG, WebP, a
one-page TIFF, and HEIC.

A version that reads the photo's text asks the environment for PaddleOCR's text finder over it (`det`); every
version then straightens each book it boxed and reads its title (reading.py), asking for `det`, `tesseract` and
`words` as it goes."""
import numpy as np
import pillow_heif
from PIL import Image, ImageOps
from scipy import ndimage as ndi
from skimage.draw import polygon as fill_polygon

import books
import fields
import r5_edges
import r8_precise
import reading
from score import SCORING, score  # noqa: F401  (the contract's scorer)

# a phone's HEIC is in tiles, which libheif otherwise decodes on threads; the page's Python cannot start one, and
# trying ends that Python for good
pillow_heif.options.DECODE_THREADS = 0
pillow_heif.register_heif_opener()


def read(path):
    """The photo as 8-bit RGB, turned as the camera said it was held."""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ('I;16', 'I;16B', 'I;16L', 'I', 'F'):
            a = np.asarray(im, np.float64)
            lo, hi = a.min(), a.max()
            im = Image.fromarray(((a - lo) / ((hi - lo) or 1) * 255).astype(np.uint8))
        return np.asarray(im.convert('RGB'))


# how far a damaged area's fill reaches for the colours around it, coarsest first, in pixels: the fine ones carry
# the colours at its border, the coarse ones its middle
FILL_REACH = (64, 16, 4)


def without_damaged(rgb, damaged):
    """The photo with each pixel whose centre lies in a damaged area ([[x, y], ...] in its pixels) painted over with
    the colours around the area, blurred, so nothing of what was there is left and no sharp edge is drawn at its
    border."""
    if not damaged:
        return rgb
    H, W = rgb.shape[:2]
    gone = np.zeros((H, W), bool)
    for poly in damaged:
        q = np.asarray(poly, float)
        gone[fill_polygon(q[:, 1] - 0.5, q[:, 0] - 0.5, (H, W))] = True
    if not gone.any():
        return rgb
    if gone.all():
        return np.zeros_like(rgb)
    # only the areas and the reach of the coarsest blur around them are worked on
    ys, xs = np.nonzero(gone); m = 3 * FILL_REACH[0]
    y0, y1, x0, x1 = max(ys.min() - m, 0), min(ys.max() + m + 1, H), max(xs.min() - m, 0), min(xs.max() + m + 1, W)
    g, a = gone[y0:y1, x0:x1], rgb[y0:y1, x0:x1].astype(np.float64)
    keep = (~g).astype(np.float64)
    fill = np.broadcast_to(a[~g].mean(axis=0), a.shape).copy()
    for s in FILL_REACH:
        w = ndi.gaussian_filter(keep, s)
        # each finer blur weighs in by how much of the photo it reaches, so no layer ends in a step
        mix = np.clip(2 * w, 0, 1)
        for c in range(a.shape[2]):
            fine = ndi.gaussian_filter(a[..., c] * keep, s) / np.maximum(w, 1e-12)
            fill[..., c] = mix * fine + (1 - mix) * fill[..., c]
    out = rgb.copy()
    out[y0:y1, x0:x1][g] = np.clip(np.rint(fill[g]), 0, 255).astype(rgb.dtype)
    return out


def version(find, reads_text):
    """A version: its finder's boxes, found with the photo's text map where it reads text, each book then read by
    `reader` (a key of reading.READERS) into fields (fields.photo). The answer: {books: [{corners, view, title (every
    field joined), fields, regions, confidence, turn}], reader}. A
    text finder the environment cannot run (its `det` answering None) leaves the boxes found without the text map,
    and the lines reader with no lines to read. Nothing of the photo's damaged areas is seen: a version finds and
    reads the photo they are painted over in."""
    def run(rgb, reader='lines', damaged=()):
        rgb = without_damaged(rgb, damaged)
        text = (yield from reading.text_map(books.text_view(rgb))) if reads_text else None
        found = find(rgb, text)
        words = yield ('words',)
        spell = reading.spelling(words) if words else (lambda t: t)
        reads = []
        for b in found:
            reads.append((yield from reading.read(books.straighten(rgb, b['corners']), reader, spell)))
        out = []
        for b, r, (f, regions) in zip(found, reads, fields.photo([r['blocks'] for r in reads])):
            out.append(dict(corners=[[float(x), float(y)] for x, y in b['corners']], view=b['view'],
                            title=' / '.join(f[k] for k in fields.FIELDS if k in f), fields=f,
                            regions={k: [float(v) for v in box] for k, box in regions.items()},
                            confidence=float(r['confidence']), turn=int(r['turn'])))
        return dict(books=out, reader=reader)
    return run


# in the order web/algorithms.json lists them
VERSIONS = {
    'r9': version(books.find, True),
    'r8': version(r8_precise.find, True),
    'r5': version(r5_edges.find, False),
}

# how far each version's numbers can be trusted: the photos it was tuned on are among those it is scored on
NOTES = {'r9': 'tuned on 5 of these photos', 'r8': 'tuned on 3 of these photos', 'r5': 'tuned by eye, before any ground truth'}


def label(rgb, answer, texts, library_seen=False):
    """The text the page's own readers read for each book, read into fields: its place on the book unknown, on its
    text alone."""
    return dict(books=[dict(zip(('fields', 'regions'), fields.label([dict(text=t)], library_seen=library_seen))) for t in texts])


STAGES = {'label': label}
