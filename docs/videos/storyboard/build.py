"""Builds the storyboard page: the two videos' scenes as drawn moments, each moment's voice rendered to audio.

    python3 docs/videos/storyboard/build.py OUT_DIR [--voice MODEL.onnx]

Scenes and their moments come from the storyboards' Markdown, each moment's sketch from frames.json. With --voice
(a Piper model; `pip install piper-tts`, installed ad hoc) each spoken moment becomes OUT_DIR/audio/*.mp3 through
ffmpeg, and its length sets the moment's; without it the page plays each moment for its hold, silent.
"""

import argparse
import copy
import json
import re
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VIDEOS = {"pitch": ("2-the-loop.md", "Teach it one image at a time"),
          "walkthrough": ("1-full-workflow.md", "A study, start to publication")}
SPEECH = {"RaunTruth": "Rawn Truth", "GT": "G T"}
BY = {"both", "picture", "voice"}


def plain(md):
    return re.sub(r"\*\*\[(UI|MG|B|C)\]\*\*\s*|\*\*|\*|`", "", md).strip()


def moments(body):
    out = []
    for line in body.splitlines():
        if not line.startswith("| ") or line.startswith("| Moment") or set(line) <= set("|- "):
            continue
        moment, by, hold, picture, voice = [c.strip() for c in line.strip().strip("|").split(" | ")]
        if by not in BY:
            raise SystemExit(f"moment {moment!r}: By is {by!r}, not one of {sorted(BY)}")
        said = " ".join(re.findall(r'"([^"]+)"', voice))
        if (by == "picture") == bool(said):
            raise SystemExit(f"moment {moment!r}: By {by} but voice {voice!r}")
        out.append({"moment": moment, "by": by, "hold": float(hold), "tags": re.findall(r"\*\*\[(UI|MG|B|C)\]\*\*", picture),
                    "picture": plain(picture), "voice": said})
    return out


def scenes(text):
    """[(chapter or None, scene)] in order; a chapter is '## N. Title · stage: S', a scene '### N[.M] Title'."""
    chapter, out = None, []
    for block in re.split(r"^(?=#{2,3} \d)", text, flags=re.M)[1:]:
        head, body = block.split("\n", 1)
        if head.startswith("## "):
            m = re.match(r"## (\d+)\. (.+?)(?: · stage: (.+))?$", head.strip())
            chapter = {"n": int(m.group(1)), "title": m.group(2), "stage": m.group(3)}
            continue
        m = re.match(r"### ([\d.]+)\.? (.+)$", head.strip())
        conveys = re.search(r"\*\*Conveys:\*\* (.+)", body)
        out.append((chapter, {"n": m.group(1), "title": m.group(2), "conveys": conveys.group(1) if conveys else "",
                              "moments": moments(body.split("\n## ")[0])}))
    return out


def merge(base, over):
    out = copy.deepcopy(base)
    for k, v in over.items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def voice(text, model, out):
    for word, said in SPEECH.items():
        text = re.sub(rf"\b{word}\b", said, text)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "v.wav"
        subprocess.run(["python3", "-m", "piper", "-m", str(model), "-f", str(wav), "--length-scale", "1.05"],
                       input=text, text=True, check=True, capture_output=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-ac", "1", "-b:a", "48k", str(out)], check=True)
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)],
                           capture_output=True, text=True, check=True)
    return round(float(probe.stdout), 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", type=Path)
    ap.add_argument("--voice", type=Path)
    args = ap.parse_args()
    sketches = json.loads((HERE / "frames.json").read_text())
    (args.out / "audio").mkdir(parents=True, exist_ok=True)
    videos = []
    for vid, (md, title) in VIDEOS.items():
        found = scenes((HERE.parent / md).read_text())
        if len(found) != len(sketches[vid]):
            raise SystemExit(f"{vid}: {len(found)} scenes in {md} but {len(sketches[vid])} in frames.json")
        chapters, k = [], 0
        for (chapter, scene), sketch in zip(found, sketches[vid]):
            if len(scene["moments"]) != len(sketch["steps"]):
                raise SystemExit(f"{vid} scene {scene['n']}: {len(scene['moments'])} moments but {len(sketch['steps'])} steps")
            for m, step in zip(scene["moments"], sketch["steps"]):
                m["frame"] = merge(sketch["base"], step)
                if args.voice and m["voice"]:
                    k += 1
                    m["audio"] = f"audio/{vid}-{k:02d}.mp3"
                    m["spoken"] = voice(m["voice"], args.voice, args.out / m["audio"])
            if not chapters or chapters[-1]["head"] is not chapter:
                chapters.append({"head": chapter, "scenes": []})
            chapters[-1]["scenes"].append(scene)
        videos.append({"id": vid, "title": title,
                       "chapters": [{**(c["head"] or {}), "scenes": c["scenes"]} for c in chapters]})
    page = (HERE / "page.html").read_text().replace("/*DATA*/null", json.dumps(videos, ensure_ascii=False))
    (args.out / "storyboard.html").write_text(page)
    print(f"wrote {args.out / 'storyboard.html'}" + (" with audio" if args.voice else ""))


if __name__ == "__main__":
    main()
