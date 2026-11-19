"""A small Olympus cellSens image for a test, laid out as cellSens saves one: `<name>.vsi` (a TIFF header, then the
tag tree holding the image's details) and `_<name>_/stack1/frame_t_0.ets` (one tile per channel and slice,
uncompressed, JPEG 2000 or JPEG). Only the details the page reads are written: the image's dimensions, its pixel
size, the z-step of a stack, and each channel's name and display colour.

    write_pair(folder, 'scan', planes, um=0.34, zstep=1.0, names=['DAPI', 'GFP'], colours=[(0, 0, 255), (0, 255, 0)])

planes: uint16 [Z, C, H, W]. The pair as one file, the way the page keeps it: zipped(folder, 'scan').
"""
import io
import os
import struct
import zipfile

import numpy as np
from PIL import Image

TYPE_DOUBLE, TYPE_TCHAR, TYPE_DIM_INDEX, TYPE_DOUBLE_2, TYPE_BGR, TYPE_UNICODE = 10, 13, 8195, 260, 270, 8192
NEW_VOLUME, EXTENDED, EXTRA_TAG = 0x80000000, 0x10000000, 0x08000000
UNIT, VALUE = 268435456, 268435458
COMPRESSION = {'raw': 0, 'jpeg': 2, 'j2k': 3}


def _utf16(s):
    return s.encode('utf-16-le')


def _volume(fields):
    """fields: [(tag, type, data bytes, second tag or None, nested fields or None)]"""
    body, offsets, at = [], [], 24
    for tag, kind, data, second, nested in fields:
        payload = _volume(nested) if nested is not None else data
        head = 16 + (4 if second is not None else 0)
        offsets.append(at)
        body.append((tag, kind, payload, second, nested is not None))
        at += head + len(payload)
    out = bytearray(struct.pack('<HHIQII', 24, 0x5349, 1, 24, len(fields), 0))
    for i, (tag, kind, payload, second, nested) in enumerate(body):
        ftype = kind | (NEW_VOLUME | EXTENDED if nested else 0) | (EXTRA_TAG if second is not None else 0)
        nxt = offsets[i + 1] if i + 1 < len(offsets) else 0
        out += struct.pack('<IIII', ftype, tag, nxt, len(payload))
        if second is not None:
            out += struct.pack('<i', second)
        out += payload
    return bytes(out)


def _measure(unit, value):
    return [(UNIT, TYPE_TCHAR, _utf16(unit), None, None), (VALUE, TYPE_DOUBLE, struct.pack('<d', value), None, None)]


def _vsi(Z, C, um, zstep, names, colours):
    channels = []
    for c in range(C):
        r, g, b = colours[c]
        lut = b''.join(bytes((round(b * i / 255), round(g * i / 255), round(r * i / 255))) for i in range(256))
        channels.append((2008, 0, None, c, [(2419, TYPE_UNICODE, _utf16(names[c]), None, None),
                                            (2004, 0, None, None, [(VALUE, TYPE_BGR, lut, None, None)])]))
    image = [(2003, TYPE_DIM_INDEX, struct.pack('<III', 1, Z, C), None, None),
             (2005, 0, None, None, [(2019, TYPE_DOUBLE_2, struct.pack('<dd', um, um), None, None)])]
    if Z > 1:
        image.append((2007, 0, None, 1, [(2008, 0, None, 0, [(2013, 0, None, None, _measure('10^-6m^1', zstep))])]))
    image.append((2007, 0, None, 2, channels))
    tree = _volume([(2000, 0, None, 0, [(2001, 0, None, 1, image)])])
    ifd = 8 + len(tree)
    return b'II*\x00' + struct.pack('<I', ifd) + tree + struct.pack('<HI', 0, 0)


def _tile(plane, compression):
    if compression == 'raw':
        return plane.astype('<u2').tobytes()
    b = io.BytesIO()
    if compression == 'j2k':
        Image.fromarray(plane).save(b, 'JPEG2000', irreversible=False, no_jp2=True)
    else:
        Image.fromarray((plane >> 8).astype(np.uint8)).save(b, 'JPEG')
    return b.getvalue()


def _ets(planes, compression):
    Z, C, H, W = planes.shape
    tiles = [((0, 0, 0, z, c, 0), _tile(planes[z, c], compression)) for z in range(Z) for c in range(C)]
    head = bytearray(64)
    ets = b'ETS\x00' + struct.pack('<9I', 0x30006, 4, 1, 1, COMPRESSION[compression], 90, W, H, 1)
    data, offsets, at = bytearray(), [], 64 + len(ets)
    for _, t in tiles:
        offsets.append(at + len(data))
        data += t
    table = 64 + len(ets) + len(data)
    struct.pack_into('<4sIIIQQQI', head, 0, b'SIS\x00', 64, 3, 6, 64, len(ets), table, len(tiles))
    records = b''.join(struct.pack('<I6IQII', 0, *coord, off, len(t), 0) for (coord, t), off in zip(tiles, offsets))
    return bytes(head) + ets + bytes(data) + records


def write_pair(folder, name, planes, um, zstep, names, colours, compression='raw'):
    planes = np.asarray(planes, np.uint16)
    Z, C = planes.shape[:2]
    with open(os.path.join(folder, name + '.vsi'), 'wb') as f:
        f.write(_vsi(Z, C, um, zstep, names, colours))
    stack = os.path.join(folder, f'_{name}_', 'stack1')
    os.makedirs(stack, exist_ok=True)
    with open(os.path.join(stack, 'frame_t_0.ets'), 'wb') as f:
        f.write(_ets(planes, compression))


def zipped(folder, name):
    """the pair as one stored zip, the .vsi first and the .ets under its own path"""
    b = io.BytesIO()
    with zipfile.ZipFile(b, 'w', zipfile.ZIP_STORED) as z:
        z.write(os.path.join(folder, name + '.vsi'), name + '.vsi')
        rel = f'_{name}_/stack1/frame_t_0.ets'
        z.write(os.path.join(folder, rel), rel)
    return b.getvalue()
