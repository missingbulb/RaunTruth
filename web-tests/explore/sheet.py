"""Pictures a persona's session hands a model (session.mjs), drawn from what the browser gave. Reads one JSON job on stdin:
    {"numbered": {"image": PNG, "out": PNG, "marks": [{"n": 3, "x": .., "y": .., "w": .., "h": ..}]}}
        the screenshot with each control's number on it, the marks in the screenshot's own pixels;
    {"sheet": {"frames": [{"file": JPG, "ms": 120}], "out": PNG}}
        the frames of one action side by side, each under how long after the action it was drawn.
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

# on dark and on light pages alike: a number a model reads off the picture has to stand out from both
BADGE, INK = (255, 221, 0), (0, 0, 0)
COLUMNS, GAP, LABEL = 4, 12, 26


def font(size):
    try:
        return ImageFont.truetype('DejaVuSans-Bold.ttf', size)
    except OSError:
        return ImageFont.load_default(size)


def numbered(job):
    im = Image.open(job['image']).convert('RGB')
    draw, f = ImageDraw.Draw(im), font(22)
    for m in job['marks']:
        draw.rectangle([m['x'], m['y'], m['x'] + m['w'], m['y'] + m['h']], outline=BADGE, width=2)
        text = str(m['n'])
        left, top, right, bottom = draw.textbbox((0, 0), text, font=f)
        w, h = right - left + 10, bottom - top + 8
        x = min(max(m['x'] - 2, 0), im.width - w)
        y = min(max(m['y'] - h // 2, 0), im.height - h)
        draw.rectangle([x, y, x + w, y + h], fill=BADGE, outline=INK)
        draw.text((x + 5 - left, y + 4 - top), text, fill=INK, font=f)
    im.save(job['out'])


def sheet(job):
    frames = [(Image.open(f['file']).convert('RGB'), f['ms']) for f in job['frames']]
    w, h = frames[0][0].size
    rows = -(-len(frames) // COLUMNS)
    cols = min(len(frames), COLUMNS)
    out = Image.new('RGB', (GAP + cols * (w + GAP), GAP + rows * (h + LABEL + GAP)), (40, 40, 40))
    draw, f = ImageDraw.Draw(out), font(18)
    for k, (im, ms) in enumerate(frames):
        x, y = GAP + (k % COLUMNS) * (w + GAP), GAP + (k // COLUMNS) * (h + LABEL + GAP)
        draw.text((x, y), f'{k + 1}:  +{ms} ms', fill=(255, 255, 255), font=f)
        out.paste(im.resize((w, h)), (x, y + LABEL))
    out.save(job['out'])


if __name__ == '__main__':
    job = json.load(sys.stdin)
    if 'numbered' in job:
        numbered(job['numbered'])
    if 'sheet' in job:
        sheet(job['sheet'])
