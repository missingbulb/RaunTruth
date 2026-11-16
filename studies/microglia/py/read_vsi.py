"""Read an Olympus cellSens image (a .vsi file and its _<name>_/stackN/frame_t_*.ets folder).

    python3 studies/microglia/py/read_vsi.py <file.vsi> [out.npy]

Prints the image's geometry and acquisition facts, reads the pixels twice - through slideio and
through the tile parser below - and fails unless the two agree bit for bit. With out.npy, saves the
pixels as a (Y, X, C) array. slideio is installed ad hoc (`pip install slideio`), not from
requirements.txt; the findings are in studies/microglia/docs/DATA-REVIEW.md.
"""
import glob
import json
import os
import struct
import sys

import numpy as np
import slideio

FACTS = ('Device Model', 'Objective Description', 'Numerical Aperture', 'Magnification',
         'Physical pixel size', 'Channel name', 'Exposure time (microseconds)', 'Creation time',
         'Product Name', 'Product Version', 'Channel Wavelength ')


def ets_paths(vsi):
    base = os.path.splitext(os.path.basename(vsi))[0]
    return sorted(glob.glob(os.path.join(os.path.dirname(vsi), f'_{base}_', 'stack*', '*.ets')))


def read_ets_raw(path):
    """Pixels of an uncompressed ETS file, one plane per tile channel: (Y, X, C) uint16.

    Layout as measured on the owner's file: a 64-byte SIS header naming the tile table's offset and
    count, then the ETS header; each table record is a 4-byte field, the tile's coordinates (the
    channel in slot 4), an 8-byte offset, a 4-byte length and a 4-byte field.
    """
    b = open(path, 'rb').read()
    assert b[:4] == b'SIS\0' and b[64:68] == b'ETS\0', 'not an ETS file'
    table, ntiles = struct.unpack_from('<QI', b, 32)
    _, ptype, _, _, compression, _, tx, ty, _ = struct.unpack_from('<9I', b, 68)
    if compression != 0 or ptype != 4:
        raise NotImplementedError(f'only uncompressed uint16 tiles (compression {compression}, pixel type {ptype})')
    rec = (len(b) - table) // ntiles
    ncoord = (rec - 20) // 4
    tiles = []
    for i in range(ntiles):
        o = table + i * rec
        coord = struct.unpack_from(f'<{ncoord}I', b, o + 4)
        off, nbytes = struct.unpack_from('<QI', b, o + 4 + 4 * ncoord)
        tiles.append((coord, off, nbytes))
    if any(c[:4] != (0, 0, 0, 0) for c, _, _ in tiles):
        raise NotImplementedError('more than one tile per channel (a mosaic, a z-stack or a pyramid)')
    out = np.zeros((ty, tx, len(tiles)), np.uint16)
    for coord, off, nbytes in tiles:
        out[:, :, coord[4]] = np.frombuffer(b, '<u2', count=nbytes // 2, offset=off).reshape(ty, tx)
    return out


def facts(metadata):
    found = []

    def walk(node):
        value = node.get('value')
        if isinstance(value, list):
            for child in value:
                walk(child)
        elif node.get('name') in FACTS and value not in ('', None, ' '):
            found.append((node['name'].strip(), value))
    walk(json.loads(metadata))
    return sorted(set(found))


def main(vsi, out=None):
    slide = slideio.open_slide(vsi, 'VSI')
    scene = slide.get_scene(0)
    print(f'scenes {slide.num_scenes}; scene 0 "{scene.name}" {scene.rect[2]}x{scene.rect[3]} px, '
          f'{scene.num_channels} channels {[scene.get_channel_name(c) for c in range(scene.num_channels)]}, '
          f'z {scene.num_z_slices}, t {scene.num_t_frames}, zoom levels {scene.num_zoom_levels}, '
          f'{scene.resolution[0] * 1e6:.6f} um/px, {scene.compression}')
    for name, value in facts(slide.raw_metadata):
        print(f'  {name}: {value}')
    pixels = scene.read_block(scene.rect)
    if pixels.ndim == 2:
        pixels = pixels[:, :, None]
    paths = ets_paths(vsi)
    raw = read_ets_raw(paths[0])
    same = np.array_equal(raw, pixels)
    print(f'{os.path.relpath(paths[0], os.path.dirname(vsi))}: tile parser {"matches" if same else "DIFFERS FROM"} slideio')
    for c in range(pixels.shape[2]):
        x = pixels[:, :, c]
        p = np.percentile(x, [1, 50, 99, 99.9])
        print(f'  channel {c}: min {x.min()} p1 {p[0]:.0f} median {p[1]:.0f} p99 {p[2]:.0f} '
              f'p99.9 {p[3]:.0f} max {x.max()} (of 65535)')
    if out:
        np.save(out, pixels)
    return 0 if same else 1


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
