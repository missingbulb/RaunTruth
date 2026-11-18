"""The smallest study the shell can run: one grey channel, and the pixels brighter than a threshold.
It exists for the shell's and the lab's tests, so it uses every part of the contract (lab/README.md) and nothing
else, not even a package: it reads 8-bit greyscale PNGs itself."""
import json
import struct
import zlib


def read_png(data):
    """(width, height, pixels) of an 8-bit greyscale, non-interlaced PNG."""
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('not a PNG')
    at, idat = 8, b''
    while at < len(data):
        n, kind = struct.unpack('>I4s', data[at:at + 8])
        body = data[at + 8:at + 8 + n]
        if kind == b'IHDR':
            W, H, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', body)
            if (depth, colour, interlace) != (8, 0, 0):
                raise ValueError('only 8-bit greyscale, non-interlaced PNGs')
        elif kind == b'IDAT':
            idat += body
        at += 12 + n
    raw, out, prev = zlib.decompress(idat), bytearray(), bytearray(W)
    for y in range(H):
        f, row = raw[y * (W + 1)], bytearray(raw[y * (W + 1) + 1:(y + 1) * (W + 1)])
        for x in range(W):
            a, b, c = row[x - 1] if x else 0, prev[x], prev[x - 1] if x else 0
            p = a + b - c
            pred = (0, a, b, (a + b) // 2, a if abs(p - a) <= abs(p - b) and abs(p - a) <= abs(p - c) else b if abs(p - b) <= abs(p - c) else c)[f]
            row[x] = (row[x] + pred) & 255
        out += row; prev = row
    return W, H, bytes(out)


def read(path):
    """The image: (width, height, pixels)."""
    with open(path, 'rb') as f:
        return read_png(f.read())


def _count(image, threshold, at):
    W, H, px = image
    above = bytes(1 if v > threshold or (at and v == threshold) else 0 for v in px)
    return dict(threshold=threshold, count=sum(above), above=above)


VERSIONS = {
    'above': lambda image, threshold=128: _count(image, threshold, False),
    'from': lambda image, threshold=128: _count(image, threshold, True),
}

SCORING = """- The answer's count against the ground truth's count, each pixel counted once
- tp: the pixels both count
- fp: the pixels the answer counts beyond the ground truth's
- fn: the pixels the ground truth counts beyond the answer's"""


def score(answer, truth):
    """tp, fp and fn of one count against the ground truth's (its labels' first count)."""
    want, got = truth['labels'][0]['count'], answer['count']
    return dict(tp=min(want, got), fp=max(0, got - want), fn=max(0, want - got))
