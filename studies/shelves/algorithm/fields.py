"""A spine's text read into fields: the blocks of text the reader read, parted where a separator stands, each labelled
title, author, publisher, volume or library mark, at most one block of text each.

    label(blocks, library_seen) -> (fields, regions)
    photo(books) -> [(fields, regions)]       every book of one photo, a library's sticker on one making it likelier
                                               on the others

A block is one line the reader read: {text, box: (x0, y0, x1, y1) in the pixels of the crop as it was read, size:
(width, height) of that crop, turn: the quarter turns clockwise it was read at}, or {text} alone, its place unknown.
A field is absent where nothing was read for it. A region is where its field was read, as shares (x0, y0, x1, y1) of
the book's straightened crop at its first turn, its top the book's head.
"""
import re
import unicodedata

FIELDS = ('title', 'author', 'publisher', 'volume', 'library')

# [separators] what parts two blocks inside one line: a slash, a bar, a dash or a dot standing alone between words, and a
# lone o or 0 between two Hebrew words, a dot as print sets it and the reader reads it
SEPARATOR = re.compile(r'\s+[/\\|•·∙.\-–—]\s+|(?<=[א-ת׳\'".])\s+[o0]\s+(?=[א-ת])')
# [author-slash] a spine's text is `author / title`: the block before a slash is the author (HEBREW.md: 11 of the 32
# books first tagged carry it). A bar or a dot says nothing of which is which
SLASH = {'/', '\\'}
# [author-initial] an initial standing alone (ל. ס. ג׳.ג׳.) is a name's
INITIAL = re.compile(r"^(?:[א-תA-Z][.׳'])+$")
# [volume] as printed: a roman numeral, a number, one letter, or a word saying it with one
VOLUME_WORD = r"(?:(?:חלק|כרך|ספר|מס')\s+\S{1,4}|(?:vol\.?|volume|part|book|no\.?)\s*\S{1,4})"
VOLUME = re.compile(rf"^{VOLUME_WORD}$", re.I)
# [volume-bare] a bare numeral or letter, only where a separator sets it apart or it stands alone at the spine's head
# or foot: anywhere else it is as likely a logo's or a picture's letter read as text
BARE = re.compile(r"^(?:[IVXLC]{1,5}|\d{1,2}|[א-ת][׳']?|[A-Z])$", re.I)
VOLUME_TAIL = re.compile(rf"^(.+?)\s+({VOLUME_WORD})$", re.I)
# [library] a call number: a Dewey class of three digits with a decimal, a short code for the author or both (three
# digits alone are as likely a number read off a picture); at the spine's head or foot, within this share of its length
CODE = r"[A-Za-zא-ת][A-Za-zא-ת.׳'\"]{0,4}\d*"
CALL = re.compile(rf"^\d{{3}}(?:\.\d+(?:\s+{CODE})?|\s+{CODE})$")
END = 0.15
# [library-seen] a looser mark once one spine of the photo carries a clear one: a short block at an end, of digits
# for this share of its letters or more
LOOSE_LONG, LOOSE_DIGITS = 12, 0.3
# [publisher-foot] a block of two letters or more at the foot, below this share of the spine, its letters no larger
# than the title's, is its publisher; [title-size] letters this many times larger than another block's are the title's, that block the
# author
FOOT, LARGER = 0.8, 1.25
# [title-size] the size cue holds only between blocks that read as words: a title of this many letters or more, an
# author of two words of two letters or more. A publisher's mark read as a few letters stands taller than the words
TITLE_LETTERS = 4
# [publishers] the imprints most often on Hebrew and English spines, matched as words at a block's end
PUBLISHERS = [
    'עם עובד', 'כתר', 'ידיעות ספרים', 'זמורה ביתן', 'זמורה ביתן מודן', 'מודן', 'ספריית מעריב', 'מועדון קוראי מעריב', 'מעריב',
    'ידיעות אחרונות', 'ספרי חמד', 'כנרת', 'הקיבוץ המאוחד', 'ספריית פועלים', 'שוקן', 'אחיאסף', 'עופרים', 'אופוס',
    'הכורסא', 'יבנה', 'מסדה', 'בבל', 'חרגול', 'אריה ניר', 'כנרת זמורה ביתן', 'מטר', 'הד ארצי', 'סטימצקי', 'פוקט',
    'Penguin', 'Vintage', 'Bantam', 'Tor', 'Ace', 'Del Rey', 'Harper', 'HarperCollins', 'Random House', 'Picador',
    'Faber', 'Orbit', 'Gollancz', 'Signet', 'Pocket Books', 'Ballantine', 'Scholastic', 'Portfolio', 'Pan', 'Oxford',
]


def words(t):
    return unicodedata.normalize('NFKC', t).replace('״', '"').split()


PUB_WORDS = sorted((words(p) for p in PUBLISHERS), key=len, reverse=True)


def hebrew(t):
    return sum('א' <= c <= 'ת' for c in t) > sum(c.isascii() and c.isalpha() for c in t)


def share(box, size, turn):
    """A box in the pixels of the crop read at a turn, as shares of the crop at its first turn."""
    (x0, y0, x1, y1), (w, h) = box, size
    pts = [(x / w, y / h) for x in (x0, x1) for y in (y0, y1)]
    back = {0: lambda x, y: (x, y), 1: lambda x, y: (y, 1 - x), 2: lambda x, y: (1 - x, 1 - y), 3: lambda x, y: (1 - y, x)}[turn % 4]
    xs, ys = zip(*(back(x, y) for x, y in pts))
    return (min(xs), min(ys), max(xs), max(ys))


def pieces(block, at):
    """A block's text parted at its separators: [{text, cut: the separator before it, u: its place along the spine
    from the head (None when unknown), h: its letters' height, region, at: its order}]."""
    text = ' '.join(block['text'].split())
    out, start, cut = [], 0, None
    parts = []
    for m in SEPARATOR.finditer(text):
        parts.append((start, m.start(), cut))
        start, cut = m.end(), m.group(0).strip()
    parts.append((start, len(text), cut))
    box, rtl = block.get('box'), hebrew(text)
    for k, (s, e, c) in enumerate(parts):
        piece = text[s:e].strip()
        if not piece:
            continue
        region = u = h = None
        if box is not None:
            x0, y0, x1, y1 = box
            n = max(1, len(text))
            a, b = (x1 - (x1 - x0) * e / n, x1 - (x1 - x0) * s / n) if rtl else (x0 + (x1 - x0) * s / n, x0 + (x1 - x0) * e / n)
            region = share((a, y0, b, y1), block['size'], block['turn'])
            u, h = (region[1] + region[3]) / 2, y1 - y0
        out.append(dict(text=piece, cut=c, u=u, h=h, region=region, at=(at, k), parts=len(parts)))
    return out


# [two-lines] two lines whose spans along the spine overlap by this share of the shorter stand side by side across
# it: one block set in two lines
BESIDE = 0.5


def side_by_side(ps):
    """Whole lines standing side by side across the spine joined into one block, in the order they were read."""
    out = []
    for p in sorted(ps, key=lambda p: p['at']):
        q = next((q for q in out if q['region'] and p['region'] and q['at'][0] != p['at'][0] and q['cut'] is None
                  and p['cut'] is None and q.get('whole') and whole(p) and along(q['region'], p['region']) >= BESIDE), None)
        if q is None:
            out.append(dict(p, whole=whole(p)))
            continue
        r = [min(q['region'][0], p['region'][0]), min(q['region'][1], p['region'][1]),
             max(q['region'][2], p['region'][2]), max(q['region'][3], p['region'][3])]
        q.update(text=q['text'] + ' ' + p['text'], region=r, u=(r[1] + r[3]) / 2, h=max(q['h'], p['h']))
    return out


def whole(p):
    """A line no separator parted."""
    return p['parts'] == 1


def along(a, b):
    """How much two regions' spans along the spine (their y, the book standing) overlap, over the shorter."""
    lo, hi = max(a[1], b[1]), min(a[3], b[3])
    return max(0.0, hi - lo) / max(1e-9, min(a[3] - a[1], b[3] - b[1]))


def split_tail(p, pattern_or_words):
    """A piece whose end is a volume or a publisher, cut there: (the rest, the end) or None."""
    if isinstance(pattern_or_words, re.Pattern):
        m = pattern_or_words.match(p['text'])
        return (m.group(1), m.group(2)) if m else None
    w = words(p['text'])
    for pub in PUB_WORDS:
        if len(w) >= len(pub) and [x.casefold() for x in w[-len(pub):]] == [x.casefold() for x in pub]:
            return ' '.join(w[:-len(pub)]), ' '.join(w[-len(pub):])
    return None


def wordy(p):
    return sum(c.isalpha() for c in p['text']) >= TITLE_LETTERS


def named(p):
    return sum(sum(c.isalpha() for c in w) >= 2 for w in p['text'].split()) >= 2


def at_end(p):
    return p['u'] is not None and (p['u'] < END or p['u'] > 1 - END)


def library_mark(p, seen):
    t = p['text']
    if CALL.match(t):
        return p['u'] is None or at_end(p)
    if seen and at_end(p) and len(t) <= LOOSE_LONG:
        letters = [c for c in t if not c.isspace()]
        return sum(c.isdigit() for c in letters) >= max(2, LOOSE_DIGITS * len(letters))
    return False


def cut_off(p, rest, end, field):
    """A piece cut in two at its end: the share of its region each part takes, by its letters."""
    n = max(1, len(p['text']))
    a = dict(p, text=rest, field=None)
    b = dict(p, text=end, field=field)
    if p['region'] is not None:
        # the end is the last of the text: along the spine, the side away from the head
        x0, y0, x1, y1 = p['region']
        f = len(rest) / n
        a['region'], b['region'] = (x0, y0, x1, y0 + (y1 - y0) * f), (x0, y0 + (y1 - y0) * f, x1, y1)
        a['u'], b['u'] = (a['region'][1] + a['region'][3]) / 2, (b['region'][1] + b['region'][3]) / 2
    return [a, b] if rest.strip() else [b]


def label(blocks, library_seen=False):
    ps = side_by_side([p for i, b in enumerate(blocks) for p in pieces(b, i)])
    # along the spine from the head; a line's own pieces in the order read
    ps.sort(key=lambda p: (p['u'] if p['u'] is not None else 0, p['at']))
    out = []
    for p in ps:
        if library_mark(p, library_seen):
            out.append(dict(p, field='library'))
        elif len(ps) > 1 and (VOLUME.match(p['text']) or BARE.match(p['text']) and (p['cut'] is not None or at_end(p))):
            out.append(dict(p, field='volume'))
        elif (t := split_tail(p, VOLUME_TAIL)):
            out.extend(cut_off(p, *t, 'volume'))
        elif (t := split_tail(p, None)):
            out.extend(cut_off(p, *t, 'publisher'))
        else:
            out.append(dict(p, field=None))
    rest = [p for p in out if p['field'] is None]
    if len(rest) > 1 and not any(p['field'] == 'publisher' for p in out):
        foot = rest[-1]
        top = max(p['h'] or 0 for p in rest[:-1])
        if (foot['u'] is not None and foot['u'] > FOOT and foot['h'] is not None and foot['h'] <= top and foot['at'][1] == 0
                and sum(c.isalpha() for c in foot['text']) >= 2):
            foot['field'], rest = 'publisher', rest[:-1]
    if len(rest) > 1:
        slash = next((k for k, p in enumerate(rest) if p['cut'] in SLASH), None)
        initial = [p for p in rest if any(INITIAL.match(w) for w in p['text'].split())]
        hs = [p['h'] for p in rest]
        if slash is not None:
            for p in rest[:slash]:
                p['field'] = 'author'
        elif len(initial) == 1:
            initial[0]['field'] = 'author'
        elif None not in hs:
            top = max((p for p in rest if wordy(p)), key=lambda p: p['h'], default=None)
            small = [p for p in rest if top and p['h'] * LARGER <= top['h'] and named(p)]
            if small:
                max(small, key=lambda p: p['h'])['field'] = 'author'
    for p in out:
        p['field'] = p['field'] or 'title'
    fields, regions = {}, {}
    for f in FIELDS:
        mine = [p for p in out if p['field'] == f and p['text'].strip()]
        if not mine:
            continue
        # one block each: a second publisher or volume read joins the first
        fields[f] = ' '.join(p['text'] for p in mine)
        boxes = [p['region'] for p in mine if p['region'] is not None]
        if boxes:
            regions[f] = [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]
    return fields, regions


def photo(books):
    """Every book of one photo labelled, each a list of blocks: a clear call number on one spine is a library's shelf,
    and a looser mark at an end of the others is taken too."""
    first = [label(b) for b in books]
    seen = any('library' in f for f, _ in first)
    return [label(b, library_seen=True) for b in books] if seen else first
