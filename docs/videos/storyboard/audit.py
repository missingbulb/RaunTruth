"""Audits a cut's sampled frames and its soundtrack, and writes the findings and a contact sheet.

    node docs/videos/storyboard/audit.cjs BUILT_DIR CUT SAMPLES_DIR
    python3 docs/videos/storyboard/audit.py BUILT_DIR CUT SAMPLES_DIR

Errors are what a viewer would see broken; warnings what a reviewer should look at. Exits 1 on any error.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
SAFE = (0.05 * W, 0.05 * H, 0.95 * W, 0.95 * H)  # title-safe: 90 % of the frame
MIN_TEXT = 20  # px at 1080p, about the smallest a phone viewer reads
MIN_CONTRAST = 3.0  # WCAG's large-text floor; on-screen video text is large
MAX_WPM = 190
STAIN = {"red": (255, 74, 61), "green": (61, 220, 106)}  # the page's --red and --green
RING = (255, 194, 46)  # the page's --ring
FULL_BLEED = {"ui", "split", "chat", "lab", "faster"}  # screens: their edges are the UI's, not a title's


def rgb(css):
    m = re.match(r"rgba?\((\d+),\s*(\d+),\s*(\d+)", css or "")
    return tuple(int(v) for v in m.groups()) if m else None


def lum(c):
    c = np.array(c) / 255
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def background(img, t):
    """The colour behind a text box: the commonest colour on a ring just outside it."""
    x0, y0, x1, y1 = [int(v) for v in (t["x"] - 6, t["y"] - 4, t["x"] + t["w"] + 6, t["y"] + t["h"] + 4)]
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W - 1, x1), min(H - 1, y1)
    if x1 <= x0 or y1 <= y0:
        return None
    a = np.asarray(img)[y0:y1, x0:x1].reshape(-1, 3)
    vals, counts = np.unique((a // 8) * 8, axis=0, return_counts=True)
    return tuple(int(v) + 4 for v in vals[counts.argmax()])


def frames(samples, built, findings):
    scenes = [m["frame"].get("scene") for sc in samples["scenes"] for m in sc["moments"]]
    order = [i for i, q in enumerate(samples["seq"]) if q["kind"] == "moment"]
    for s in samples["samples"]:
        s["scene"] = scenes[order.index(s["i"])] if s["i"] in order else "chapter"
        img = Image.open(Path(built) / s["shot"]).convert("RGB")
        visible = [t for t in s["texts"] if t["text"].strip() and t["opacity"] > 0.5 and t["w"] > 0]
        where = f"{s['shot']} ({s['t']:.1f} s)"
        for t in visible:
            label = t["text"][:40]
            inside = t["x"] >= 0 and t["y"] >= 0 and t["x"] + t["w"] <= W and t["y"] + t["h"] <= H
            gone = t["x"] + t["w"] <= 0 or t["y"] + t["h"] <= 0 or t["x"] >= W or t["y"] >= H
            if gone:
                continue
            if not inside:
                findings.append(("error", where, f"text sliced by the frame's edge: {label!r}"))
            elif not t["caption"] and s["scene"] not in FULL_BLEED and (t["x"] < SAFE[0] or t["y"] < SAFE[1] or t["x"] + t["w"] > SAFE[2] or t["y"] + t["h"] > SAFE[3]):
                findings.append(("warning", where, f"text outside title-safe: {label!r}"))
            if t["size"] < MIN_TEXT and t["h"] > 0:
                findings.append(("warning", where, f"text {t['size']:.0f}px, under {MIN_TEXT}px: {label!r}"))
            fg, bg = rgb(t["fill"]), background(img, t)
            if fg and bg and contrast(fg, bg) < MIN_CONTRAST:
                findings.append(("warning", where, f"contrast {contrast(fg, bg):.1f}:1 for {label!r}"))
        for i, a in enumerate(visible):
            for b in visible[i + 1:]:
                ix = max(0, min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"]))
                iy = max(0, min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"]))
                small = min(a["w"] * a["h"], b["w"] * b["h"]) or 1
                if ix * iy / small > 0.25:
                    if a["caption"] or b["caption"]:
                        findings.append(("warning", where, f"the subtitle covers {(b if a['caption'] else a)['text'][:30]!r}"))
                    else:
                        findings.append(("error", where, f"texts overlap: {a['text'][:25]!r} and {b['text'][:25]!r}"))


def story(samples, findings):
    moments = [m for sc in samples["scenes"] for m in sc["moments"]]
    seq = [s for s in samples["seq"] if s["kind"] == "moment"]
    best = 0
    for m, s in zip(moments, seq):
        if m["voice"] and m["spoken"]:
            wpm = len(m["voice"].split()) / m["spoken"] * 60
            if wpm > MAX_WPM:
                findings.append(("warning", m["moment"], f"voice at {wpm:.0f} words a minute, over {MAX_WPM}"))
        text = json.dumps(m["frame"]) + " " + m["picture"]
        versions = [int(v) for v in re.findall(r"\bv(\d+)\b", text)]
        if versions:
            if max(versions) < best and "v1" not in m["picture"]:
                findings.append(("warning", m["moment"], f"shows v{max(versions)} after v{best} was kept: versions should only rise"))
            best = max(best, max(versions))
    for name, c in STAIN.items():
        a, b = np.array(RING, float), np.array(c, float)
        cos = a @ b / np.linalg.norm(a) / np.linalg.norm(b)
        if cos > 0.97:
            findings.append(("error", "palette", f"the ring's colour is {cos:.3f} similar to the stain's {name}"))


def audio(path, findings):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", out)
    tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", out)
    lufs, peak = float(i[-1]), float(tp[-1])
    if abs(lufs + 14) > 1.5:
        findings.append(("warning", path.name, f"integrated loudness {lufs} LUFS, target -14"))
    if peak > -0.5:
        findings.append(("error", path.name, f"true peak {peak} dBFS, over -1"))
    return lufs, peak


def sheet(samples, built, out):
    tag = [s for s in samples["samples"] if s["tag"] == "end"]
    cols, tw, th = 6, 320, 180
    rows = (len(tag) + cols - 1) // cols
    img = Image.new("RGB", (cols * tw, rows * (th + 28)), (238, 240, 236))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 13)
    except OSError:
        font = ImageFont.load_default()
    names = [m["moment"] for sc in samples["scenes"] for m in sc["moments"]]
    k = 0
    for n, s in enumerate(tag):
        x, y = (n % cols) * tw, (n // cols) * (th + 28)
        img.paste(Image.open(Path(built) / s["shot"]).resize((tw - 4, th - 4), Image.LANCZOS), (x + 2, y + 2))
        label = names[k] if s["kind"] == "moment" else "chapter card"
        k += s["kind"] == "moment"
        d.text((x + 4, y + th + 4), f"{s['t']:.1f}s  {label}"[:44], fill=(30, 30, 30), font=font)
    img.save(out)


def main():
    built, cut, sampled = sys.argv[1:4]
    samples = json.loads((Path(sampled) / "samples.json").read_text())
    findings = []
    frames(samples, sampled, findings)
    story(samples, findings)
    track = Path(built) / "audio" / f"{cut}.mp3"
    lufs, peak = audio(track, findings) if track.exists() else (None, None)
    under = samples.get("mix", {}).get("music_under_voice_db")
    if under is not None and under > -10:
        findings.append(("warning", track.name, f"music only {-under} dB under the voice; keep it 12-15 dB under"))
    sheet(samples, sampled, Path(sampled) / "contact-sheet.png")
    seen, lines = set(), [f"# Audit of {cut}", "", f"{len(samples['samples'])} frames sampled; soundtrack {lufs} LUFS, true peak {peak} dBFS, music {under} dB under the voice.", ""]
    for level, where, what in findings:
        if (level, what) in seen:
            continue
        seen.add((level, what))
        lines.append(f"- **{level}** · {where} · {what}")
    if not findings:
        lines.append("- no findings")
    (Path(sampled) / "audit.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    sys.exit(1 if any(f[0] == "error" for f in findings) else 0)


if __name__ == "__main__":
    main()
