"""Builds the storyboard page: the two video storyboards as frames, with each beat's voice-over rendered to audio.

    python3 docs/videos/storyboard/build.py OUT_DIR [--voice MODEL.onnx]

The picture and voice text come from the storyboards' Markdown; the sketch drawn for each beat from frames.json.
With --voice (a Piper model; `pip install piper-tts`, installed ad hoc) each beat's spoken lines become
OUT_DIR/audio/*.mp3 (ffmpeg); without it the page plays the frames on their planned times, silent.
"""

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VIDEOS = HERE.parent
SPEECH = {"RaunTruth": "Rawn Truth", "GT": "G T"}


def plain(md):
    md = re.sub(r"\*\*|\*|`", "", md)
    return md.replace("\\|", "|").strip()


def spoken(cell):
    return " ".join(re.findall(r'"([^"]+)"', cell))


def tags(cell):
    return re.findall(r"\*\*\[(UI|MG|B|C)\]\*\*", cell)


def rows(lines):
    out = []
    for line in lines:
        if not line.startswith("| ") or line.startswith("| #") or line.startswith("| Picture") or set(line) <= set("|- "):
            continue
        out.append([c.strip() for c in line.strip().strip("|").split(" | ")])
    return out


def clock(t):
    m, s = t.split(":")
    return int(m) * 60 + int(s)


def pitch():
    text = (VIDEOS / "2-the-loop.md").read_text()
    beats = []
    for n, time, picture, voice in rows(text.split("## Beat sheet")[1].split("## Why")[0].splitlines()):
        start, end = time.split("–")
        beats.append({"n": n, "planned": clock(end) - clock(start), "tags": tags(picture),
                      "picture": plain(re.sub(r"\*\*\[\w+\]\*\*\s*", "", picture)), "voice": spoken(voice)})
    return {"id": "pitch", "title": "Teach it one image at a time", "chapters": [{"title": None, "beats": beats}]}


def walkthrough():
    text = (VIDEOS / "1-full-workflow.md").read_text()
    chapters = []
    for block in re.split(r"^## (?=\d+\. )", text, flags=re.M)[1:]:
        head, body = block.split("\n", 1)
        m = re.match(r"(\d+)\. (.+?) — ([\d:]+)–([\d:]+)(?: · stage: (.+))?$", head.strip())
        body = body.split("\n## ")[0]
        found = rows(body.splitlines())
        span = clock(m.group(4)) - clock(m.group(3))
        words = [len(spoken(v).split()) or 1 for _, v in found]
        beats = [{"n": f"{m.group(1)}.{i + 1}", "planned": round(span * w / sum(words), 1), "tags": tags(p),
                  "picture": plain(re.sub(r"\*\*\[\w+\]\*\*\s*", "", p)), "voice": spoken(v)}
                 for i, ((p, v), w) in enumerate(zip(found, words))]
        chapters.append({"n": int(m.group(1)), "title": m.group(2), "stage": m.group(5), "beats": beats})
    return {"id": "walkthrough", "title": "A study, start to publication", "chapters": chapters}


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
    videos = [pitch(), walkthrough()]
    (args.out / "audio").mkdir(parents=True, exist_ok=True)
    for video in videos:
        beats = [b for c in video["chapters"] for b in c["beats"]]
        frames = sketches[video["id"]]
        if len(frames) != len(beats):
            raise SystemExit(f"{video['id']}: {len(beats)} storyboard rows but {len(frames)} sketches in frames.json")
        for i, (beat, frame) in enumerate(zip(beats, frames)):
            beat["frame"] = frame
            if args.voice and beat["voice"]:
                name = f"audio/{video['id']}-{i + 1:02d}.mp3"
                beat["audio"] = name
                beat["spoken"] = voice(beat["voice"], args.voice, args.out / name)
    page = (HERE / "page.html").read_text().replace("/*DATA*/null", json.dumps(videos, ensure_ascii=False))
    (args.out / "storyboard.html").write_text(page)
    print(f"wrote {args.out / 'storyboard.html'}" + (" with audio" if args.voice else ""))


if __name__ == "__main__":
    main()
