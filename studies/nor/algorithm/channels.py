"""The image as the finders take it: an ImageJ TIFF's (or an RGB PNG's) Caspr, Nav and DAPI channels, the
DAPI nucleus mask, and the few image-wide measurements every finder shares."""
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

def load(path):
    if path.lower().endswith(('.tif', '.tiff')):
        import tifffile
        with tifffile.TiffFile(path) as t:
            a = t.asarray().astype(np.float64)          # C,Y,X
            luts = (t.imagej_metadata or {}).get('LUTs')
            um = um_per_px(t.pages[0])
        if not luts or a.ndim != 3 or len(a) != 3:
            raise ValueError('expected a 3-channel ImageJ TIFF with display colours (LUTs)')
        cols = []
        for l in luts:
            l = np.asarray(l); cols.append('rgb'[int(np.argmax(l[:, -1]))])
        # by role, never by display colour (data/README.md): Caspr is the green-displayed channel,
        # DAPI the other channel of large blobs, Nav the rest
        g = cols.index('g')
        dapi = max((k for k in range(3) if k != g), key=lambda k: blob_area(a[k]))
        r = 3 - g - dapi
        return a[g], a[r], um, a[dapi]
    with Image.open(path) as f:
        im = np.asarray(f.convert('RGB')).astype(np.float64)
    return im[..., 1], im[..., 0], None, im[..., 2]

def um_per_px(page, tag='XResolution'):
    res = page.tags.get(tag)
    return 1 / res.value[0] * res.value[1] if res and res.value[0] else None


def blob_area(c):
    """Mean area of the brightest 3% after a sigma-2 blur, in connected pieces: large for nuclei."""
    b = ndi.gaussian_filter(c, 2); m = b > np.quantile(b, .97)
    lab, n = ndi.label(m); return m.sum() / max(n, 1)

def to8(c):
    lo, hi = np.quantile(c, 0.005), np.quantile(c, 0.998)
    return (np.clip((c - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8)

BLUE_FRAC_OF_OTSU = 0.45   # Otsu alone hugs only the nucleus core; this catches its dim rim too
BLUE_GROW = 2              # px dilation past the threshold edge
BLUE_MIN_AREA = 30         # px; smaller bright-blue specks are not nuclei


def blue_mask(dapi):
    """Bright-blue (nucleus) pixels: blurred DAPI above a fraction of its Otsu level, holes filled."""
    from skimage.filters import threshold_otsu
    b = ndi.gaussian_filter(dapi, 2)
    m = b > BLUE_FRAC_OF_OTSU * threshold_otsu(b)
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, 1 + np.nonzero(sizes >= BLUE_MIN_AREA)[0])
    m = ndi.binary_fill_holes(m)
    return ndi.binary_dilation(m, iterations=BLUE_GROW)


def quantile_valid(chan, q, valid=None):
    """Quantile over the imaged area only, so canvas padding cannot move the threshold."""
    v = chan if valid is None else chan[valid]
    if v.size == 0:
        v = chan
    return float(np.quantile(v, q))


def norm(c, valid=None):
    """Robust percentile normalisation: relative, so it survives a change of exposure or scale."""
    lo = quantile_valid(c, 0.01, valid); hi = quantile_valid(c, 0.995, valid)
    return np.clip((c - lo) / max(hi - lo, 1e-9), 0, 1)


# ---------------------------------------------------------------- components


def bilinear(img, y, x):
    h, w = img.shape
    y = np.clip(y, 0, h - 1.001); x = np.clip(x, 0, w - 1.001)
    y0 = np.floor(y).astype(int); x0 = np.floor(x).astype(int)
    fy = y - y0; fx = x - x0
    return (img[y0, x0] * (1 - fy) * (1 - fx) + img[y0 + 1, x0] * fy * (1 - fx)
            + img[y0, x0 + 1] * (1 - fy) * fx + img[y0 + 1, x0 + 1] * fy * fx)
