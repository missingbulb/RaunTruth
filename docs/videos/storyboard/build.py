"""Builds the storyboard page: every cut's scenes as drawn moments, timed, with a mixed soundtrack per cut.

    python3 docs/videos/storyboard/build.py OUT_DIR [--voices DIR]

Scenes and moments come from the storyboards' Markdown (a pitch cut joins the brief's pictures to its own holds,
camera, voice and sound), each moment's sketch from frames.json. With --voices (a folder of the Piper models the
cuts name; `pip install piper-tts`, installed ad hoc) each cut gets OUT_DIR/audio/<cut>.mp3: its voice, music beds
and sound effects mixed by sound.py, the voice's real length setting each moment's. Without it the page plays
silent, voice lengths estimated.
"""

import argparse
import copy
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent
sys.path.insert(0, str(HERE))
import sound  # noqa: E402

CUTS = [  # id, frames key, title, the scene file(s): brief and cut, or one file holding both
    ("pitch-playful", "pitch", "Pitch · playful", ["2-the-loop.md", "2c-playful.md"]),
    ("pitch-documentary", "pitch", "Pitch · documentary", ["2-the-loop.md", "2a-documentary.md"]),
    ("pitch-launch", "pitch", "Pitch · launch", ["2-the-loop.md", "2b-launch.md"]),
    ("walkthrough", "walkthrough", "Walkthrough · documentary", ["1-full-workflow.md"]),
]
SPEECH = {"RaunTruth": "Rawn Truth", "GT": "G T", "v1": "v one", "v2": "v two"}
BY = {"both", "picture", "voice"}
CAMERA = re.compile(r"`(push|pull|punch|whip|drift|shake|still|pan-l|pan-r)(?:@(\d+),(\d+))?`")
CUE = re.compile(r"`(bed|sfx):([\w-]+)(?:@([\d.]+))?`")
CHAPTER_CARD = 2.5
PAD = 0.3


def plain(md):
    return re.sub(r"\*\*\[(UI|MG|B|C)\]\*\*\s*|\*\*|\*|`", "", md).strip()


def tables(text):
    """[(chapter, scene head, conveys, rows as dicts by column name)] in order."""
    chapter, out = None, []
    for block in re.split(r"^(?=#{2,3} \d)", text, flags=re.M)[1:]:
        head, body = block.split("\n", 1)
        if head.startswith("## "):
            m = re.match(r"## (\d+)\. (.+?)(?: · stage: (.+))?$", head.strip())
            chapter = {"n": int(m.group(1)), "title": m.group(2), "stage": m.group(3)}
            continue
        body = body.split("\n## ")[0]
        lines = [l for l in body.splitlines() if l.startswith("| ") and not set(l) <= set("|- ")]
        cols = [c.strip().lower() for c in lines[0].strip().strip("|").split(" | ")]
        rows = [dict(zip(cols, [c.strip() for c in l.strip().strip("|").split(" | ")])) for l in lines[1:]]
        conveys = re.search(r"\*\*Conveys:\*\* (.+)", body)
        out.append((chapter, head.strip("# ").strip(), conveys.group(1) if conveys else "", rows))
    return out


def moment(row):
    by = row["by"]
    if by not in BY:
        raise SystemExit(f"moment {row['moment']!r}: By is {by!r}, not one of {sorted(BY)}")
    said = " ".join(re.findall(r'"([^"]+)"', row["voice"]))
    if (by == "picture") == bool(said):
        raise SystemExit(f"moment {row['moment']!r}: By {by} but voice {row['voice']!r}")
    cam = CAMERA.search(row.get("camera", "")) or None
    return {"moment": row["moment"], "by": by, "hold": float(row["hold"]),
            "tags": re.findall(r"\*\*\[(UI|MG|B|C)\]\*\*", row["picture"]), "picture": plain(row["picture"]),
            "voice": said, "camera": plain(row.get("camera", "")), "sound": plain(row.get("sound", "")),
            "cam": {"kind": cam.group(1), "x": int(cam.group(2) or 50), "y": int(cam.group(3) or 50)} if cam else None,
            "cues": [(k, n, float(t or 0)) for k, n, t in CUE.findall(row.get("sound", ""))]}


def load(files):
    texts = [(DOCS / f).read_text() for f in files]
    found = tables(texts[0])
    voice = re.search(r"\*\*Voice:\*\* `([\w-]+)` at length scale ([\d.]+)", texts[-1])
    if len(files) == 2:
        cut = tables(texts[1])
        if [h for _, h, _, _ in cut] != [h for _, h, _, _ in found]:
            raise SystemExit(f"{files[1]}: its scenes differ from {files[0]}'s")
        joined = []
        for (chapter, head, conveys, rows), (_, _, _, cuts) in zip(found, cut):
            if [r["moment"] for r in rows] != [r["moment"] for r in cuts]:
                raise SystemExit(f"{files[1]} scene {head!r}: its moments differ from the brief's")
            joined.append((chapter, head, conveys, [{**r, **c} for r, c in zip(rows, cuts)]))
        found = joined
    tone = re.search(r"\*\*Tone:\*\* (.+)", texts[-1])
    return found, (voice.group(1), float(voice.group(2))) if voice else None, tone.group(1) if tone else ""


def merge(base, over):
    out = copy.deepcopy(base)
    for k, v in over.items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def speak(text, model, scale):
    for word, said in SPEECH.items():
        text = re.sub(rf"\b{word}\b", said, text)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "v.wav"
        subprocess.run(["python3", "-m", "piper", "-m", str(model), "-f", str(wav), "--length-scale", str(scale)],
                       input=text, text=True, check=True, capture_output=True)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-f", "f32le", "-ac", "1", "-ar", str(sound.SR), "-"],
                             capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(float) * 0.9


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", type=Path)
    ap.add_argument("--voices", type=Path)
    args = ap.parse_args()
    sketches = json.loads((HERE / "frames.json").read_text())
    (args.out / "audio").mkdir(parents=True, exist_ok=True)
    videos = []
    for vid, key, title, files in CUTS:
        found, voice, tone = load(files)
        if len(found) != len(sketches[key]):
            raise SystemExit(f"{vid}: {len(found)} scenes but {len(sketches[key])} in frames.json")
        chapters, seq, beds, fx, voices, t = [], [], [], [], [], 0.0
        for (chapter, head, conveys, rows), sketch in zip(found, sketches[key]):
            if len(rows) != len(sketch["steps"]):
                raise SystemExit(f"{vid} scene {head!r}: {len(rows)} moments but {len(sketch['steps'])} steps")
            if chapter and (not chapters or chapters[-1]["head"] is not chapter):
                seq.append({"kind": "chapter", "c": len(chapters), "at": round(t, 3), "dur": CHAPTER_CARD})
                fx.append((t, "swish"))
                t += CHAPTER_CARD
            if not chapters or chapters[-1]["head"] is not chapter:
                chapters.append({"head": chapter, "scenes": []})
            n, name = head.split(" ", 1)
            scene = {"n": n.rstrip("."), "title": name, "conveys": conveys, "moments": []}
            chapters[-1]["scenes"].append(scene)
            for row, step in zip(rows, sketch["steps"]):
                m = moment(row)
                m["frame"] = merge(sketch["base"], step)
                samples = speak(m["voice"], args.voices / f"{voice[0]}.onnx", voice[1]) if args.voices and m["voice"] else None
                m["spoken"] = round(len(samples) / sound.SR, 2) if samples is not None else round(len(m["voice"].split()) / 2.4, 2) if m["voice"] else 0
                dur = m["hold"] if m["by"] == "picture" else m["spoken"] + PAD if m["by"] == "voice" else max(m["spoken"], m["hold"]) + PAD
                if samples is not None:
                    voices.append((t + 0.12, samples))
                for kind, cue, off in m["cues"]:
                    (beds.append((t, cue)) if kind == "bed" else fx.append((t + off, cue)))
                seq.append({"kind": "moment", "ref": [len(chapters) - 1, len(chapters[-1]["scenes"]) - 1, len(scene["moments"])],
                            "at": round(t, 3), "dur": round(dur, 3)})
                scene["moments"].append(m)
                t += dur
        video = {"id": vid, "title": title, "tone": tone, "voice": voice[0] if voice else None, "total": round(t, 2),
                 "chapters": [{**(c["head"] or {}), "scenes": c["scenes"]} for c in chapters], "seq": seq,
                 "beds": [{"at": round(a, 3), "name": b} for a, b in sorted(beds)], "fx": [{"at": round(a, 3), "name": f} for a, f in fx]}
        if args.voices:
            track = sound.mix(t, beds, fx, voices)
            path = f"audio/{vid}.mp3"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(sound.SR), "-ac", "2", "-i", "-",
                            "-af", "acompressor=threshold=-18dB:ratio=2.5:attack=8:release=120,loudnorm=I=-14:TP=-1:LRA=11",
                            "-ar", str(sound.SR), "-b:a", "160k", str(args.out / path)], input=track.astype(np.float32).tobytes(), check=True)
            video["soundtrack"] = path
            video["mix"] = dict(sound.REPORT)
        videos.append(video)
        print(f"{vid}: {t:.1f} s")
    page = (HERE / "page.html").read_text().replace("/*DATA*/null", json.dumps(videos, ensure_ascii=False))
    (args.out / "storyboard.html").write_text(page)
    print(f"wrote {args.out / 'storyboard.html'}" + (" with soundtracks" if args.voices else ""))


if __name__ == "__main__":
    main()
