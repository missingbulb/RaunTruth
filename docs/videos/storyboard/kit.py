"""Packs the pitch's precursor artifacts into a kit for making it in another tool: brief, scene goals, script,
timeline, subtitles, frames (PNG and editable SVG), a contact sheet, the production bible and the product's look.

    python3 docs/videos/storyboard/build.py BUILT --voices VOICES_DIR
    python3 docs/videos/storyboard/kit.py BUILT OUT.zip

The build's voice lengths set the timeline; the kit exports the frames and the contact sheet itself.
"""

import csv
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent
REPO = DOCS.parent.parent
CHOSEN = "pitch-playful"
CUTS = ["pitch-playful", "pitch-documentary", "pitch-launch"]


def tc(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def srt_tc(t):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"


def chunks(voice):
    """The subtitle lines, split as the render splits them: at 46 characters or a sentence's end."""
    out, line = [], []
    for w in voice.split():
        line.append(w)
        if len(" ".join(line)) > 46 or re.search(r"[.?!]$", w):
            out.append(" ".join(line))
            line = []
    if line:
        out.append(" ".join(line))
    return out


def rows(video):
    out = []
    for s in video["seq"]:
        if s["kind"] != "moment":
            continue
        sc = video["chapters"][s["ref"][0]]["scenes"][s["ref"][1]]
        m = sc["moments"][s["ref"][2]]
        slug = f"{int(sc['n']):02d}.{s['ref'][2] + 1}-" + re.sub(r"[^a-z0-9]+", "-", m["moment"].lower()).strip("-")
        out.append({"start": s["at"], "end": s["at"] + s["dur"], "scene": sc["n"], "scene_title": sc["title"], "conveys": sc["conveys"],
                    "moment": m["moment"], "by": m["by"], "hold": m["hold"], "voice": m["voice"], "spoken": m.get("spoken", 0),
                    "picture": m["picture"], "tags": " ".join(m["tags"]), "camera": m["camera"], "sound": m["sound"],
                    "frame": slug})
    return out


def captions(rs):
    cues = []
    for r in rs:
        if not r["voice"]:
            continue
        parts, words = chunks(r["voice"]), len(r["voice"].split())
        at, spoken = r["start"] + 0.12, max(r["spoken"], 0.1)
        done = 0
        for p in parts:
            n = len(p.split())
            cues.append((at + spoken * done / words, at + spoken * (done + n) / words, p))
            done += n
    return cues


def script_md(video, rs):
    lines = [f"# {video['title']} — script", "", f"**Tone:** {video['tone']}", "",
             f"Running time {tc(video['total'])}. Frames are in `03-frames/` by the name in each row; times are the timeline's.", ""]
    scene = None
    for r in rs:
        if r["scene"] != scene:
            scene = r["scene"]
            lines += [f"## {r['scene']}. {r['scene_title']}", "", f"**Conveys:** {r['conveys']}", ""]
        lines += [f"### {tc(r['start'])}–{tc(r['end'])} · {r['moment']} · {r['by']}", "",
                  f"- **Picture** ({r['tags'] or 'continues'}): {r['picture']}", f"- **Camera:** {r['camera'] or 'still'}"]
        if r["voice"]:
            lines.append(f"- **Voice:** \"{r['voice']}\"")
        if r["sound"]:
            lines.append(f"- **Sound:** {r['sound']}")
        lines += [f"- **Frames:** `{r['frame']}-start` → `{r['frame']}-end`", ""]
    return "\n".join(lines)


README = """# RaunTruth pitch — precursor kit

Everything needed to make the pitch video in another tool, short of the sound. The chosen cut is **playful**;
documentary and launch are the alternatives, with the same scenes and pictures and their own narration, timing and
camera.

## What is where

| Folder | What | Use it for |
|---|---|---|
| `01-brief/` | the brief (scenes, what each must convey, pictures), the three cuts, the method, the production bible | understanding what each scene must do before changing it |
| `02-script/` | per cut: a readable script with timecodes, `timeline.csv`, subtitles (`.srt`, `.vtt`) | the edit: import the CSV as markers, the SRT as captions, record the voice from the script |
| `03-frames/` | every moment's first and last frame, 1920×1080 PNG and standalone SVG, and a contact sheet of them all | the picture: place PNGs on the timeline, or open the SVGs in Figma, Illustrator or After Effects to animate |
| `04-reference/` | today's real app (screenshot, poster), the palette and fonts | matching the product's real look |

## Timing

`timeline.csv` holds each moment's `start` and `end` in seconds, what carries it (`by`: picture, voice or both),
how long the picture needs (`hold`) and its frame names. A moment lasts the longer of its voice and its hold; the
times here come from a draft synthetic voice, so a recorded voice will move them, and the holds are the floor.
The `camera` and `sound` columns are direction: the camera move on the frame, and the music or effect the moment
cues. Pronunciation: Ranvier *ron-vee-AY*, Caspr *CAS-per*, Nav1.6 *nav one point six*.

## Picture

All frames are drawn: the product's UI as the study-stages design (PR 1036) will look, not yet capturable. The
production bible (`01-brief/PRODUCTION.md`) lists the elements that must stay consistent across scenes (one
image, the amber ring never in the stain's red or green, versions only rising) and which frames become real
captures once that UI exists. Bars marked illustrative are not measured numbers and must stay labelled so until
real ones replace them. The agent is "your AI software engineer", never a product name.

Fonts: Archivo (display), IBM Plex Sans (text), IBM Plex Mono (labels), all on Google Fonts. Palette:
`04-reference/palette.json`.
"""


def main():
    built, out = Path(sys.argv[1]), Path(sys.argv[2])
    page = (built / "storyboard.html").read_text()
    videos = {v["id"]: v for v in json.loads(re.search(r"const VIDEOS = (\[.*?\]);\n", page, re.S).group(1))}
    with tempfile.TemporaryDirectory() as tmp:
        kit = Path(tmp) / "RaunTruth-pitch-kit"
        for d in ("01-brief", "02-script", "03-frames", "04-reference"):
            (kit / d).mkdir(parents=True, exist_ok=True)
        (kit / "README.md").write_text(README)
        for f in ("2-the-loop.md", "2c-playful.md", "2a-documentary.md", "2b-launch.md", "PRODUCTION.md", "README.md"):
            shutil.copy(DOCS / f, kit / "01-brief" / (f if f != "README.md" else "METHOD.md"))
        for cut in CUTS:
            v, name = videos[cut], cut.replace("pitch-", "")
            rs = rows(v)
            with open(kit / "02-script" / f"{name}-timeline.csv", "w", newline="") as fh:
                w = csv.DictWriter(fh, fieldnames=list(rs[0]))
                w.writeheader()
                w.writerows({**r, "start": round(r["start"], 3), "end": round(r["end"], 3)} for r in rs)
            (kit / "02-script" / f"{name}-script.md").write_text(script_md(v, rs))
            cues = captions(rs)
            (kit / "02-script" / f"{name}.srt").write_text("\n".join(f"{i + 1}\n{srt_tc(a)} --> {srt_tc(b)}\n{t}\n" for i, (a, b, t) in enumerate(cues)))
            (kit / "02-script" / f"{name}.vtt").write_text("WEBVTT\n\n" + "\n".join(f"{srt_tc(a).replace(',', '.')} --> {srt_tc(b).replace(',', '.')}\n{t}\n" for a, b, t in cues))
        subprocess.run(["node", str(HERE / "frames.cjs"), str(built), CHOSEN, str(kit / "03-frames")], check=True)
        audit = Path(tmp) / "audit"
        subprocess.run(["node", str(HERE / "audit.cjs"), str(built), CHOSEN, str(audit)], check=True, capture_output=True)
        subprocess.run(["python3", str(HERE / "audit.py"), str(built), CHOSEN, str(audit)], capture_output=True)
        shutil.copy(audit / "contact-sheet.png", kit / "03-frames" / "contact-sheet.png")
        shutil.copy(REPO / "docs" / "screenshot.png", kit / "04-reference" / "today-nor-finder.png")
        shutil.copy(REPO / "studies" / "nor" / "web" / "poster.jpg", kit / "04-reference" / "nor-finder-poster.jpg")
        tokens = dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]{6})", (HERE / "page.html").read_text().split("@media")[0]))
        (kit / "04-reference" / "palette.json").write_text(json.dumps({"light": tokens, "fonts": {
            "display": "Archivo", "text": "IBM Plex Sans", "labels": "IBM Plex Mono"}}, indent=1) + "\n")
        out.parent.mkdir(parents=True, exist_ok=True)
        if out.exists():
            out.unlink()
        shutil.make_archive(str(out.with_suffix("")), "zip", Path(tmp), "RaunTruth-pitch-kit")
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
