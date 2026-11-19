"""The Bookshelf Reader's algorithm, as the page and the lab both run it (lab/README.md): a photo of shelves opened,
and in one go every book on it boxed and its title read. Any single 2D image Pillow opens: JPEG, PNG, WebP, a
one-page TIFF, and HEIC.

A version that reads the photo's text asks the environment for PaddleOCR's text finder over it (`det`); every
version then straightens each book it boxed and reads its title (reading.py), asking for `det`, `tesseract` and
`words` as it goes."""
import numpy as np
import pillow_heif
from PIL import Image, ImageOps

import books
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


def version(find, reads_text):
    """A version: its finder's boxes, found with the photo's text map where it reads text, each book then read by
    `reader` (a key of reading.READERS). The answer: {books: [{corners, view, title, confidence, turn}], reader}. A
    text finder the environment cannot run (its `det` answering None) leaves the boxes found without the text map,
    and the lines reader with no lines to read."""
    def run(rgb, reader='lines'):
        text = (yield from reading.text_map(books.text_view(rgb))) if reads_text else None
        found = find(rgb, text)
        words = yield ('words',)
        spell = reading.spelling(words) if words else (lambda t: t)
        out = []
        for b in found:
            r = yield from reading.read(books.straighten(rgb, b['corners']), reader, spell)
            out.append(dict(corners=[[float(x), float(y)] for x, y in b['corners']], view=b['view'],
                            title=r['text'], confidence=float(r['confidence']), turn=int(r['turn'])))
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


def straighten(rgb, answer, corners):
    """Each book's crop, RGBA, in the order asked: what the page's own readers read while ground truth is made."""
    return dict(crops=[books.straighten(rgb, c) for c in corners])


STAGES = {'straighten': straighten}
