"""The services a version may ask the environment for, served natively: the engines the page runs in the browser
(onnxruntime-web, tesseract.js), here ONNX Runtime and the Tesseract command, loaded with the files the study's
study.json names under `services`, so both read with the same models.

  det(tensor)              the study's `det` ONNX model on a float32 [1, 3, H, W] tensor: its first output
  tesseract(image, langs)  Tesseract (LSTM, one block of text) on an RGB(A) uint8 image: {text, confidence 0..100}
  words()                  the study's word lists, one after the other

Needs `pip install onnxruntime` and the Tesseract command (`apt-get install tesseract-ocr`); a study using neither
needs neither.
"""
import functools
import gzip
import os
import shutil
import subprocess
import tempfile
import urllib.request

import numpy as np


def native(study):
    spec = study.manifest.get('services') or {}
    here = study.dir
    path = lambda rel: rel if '://' in rel else os.path.join(here, rel)
    cache = os.path.join(study.data, 'services')

    @functools.lru_cache(None)
    def session():
        import onnxruntime as ort
        o = ort.SessionOptions()
        o.intra_op_num_threads = o.inter_op_num_threads = 1
        return ort.InferenceSession(path(spec['det']), o, providers=['CPUExecutionProvider'])

    def det(tensor):
        s = session()
        out = s.run(None, {s.get_inputs()[0].name: np.asarray(tensor, np.float32)})[0]
        return out[0, 0]

    @functools.lru_cache(None)
    def tessdata():
        out = os.path.join(cache, 'tessdata')
        os.makedirs(out, exist_ok=True)
        src = path(spec['tessdata'])
        for f in os.listdir(src):
            name = f[:-3] if f.endswith('.gz') else f
            if not os.path.exists(os.path.join(out, name)):
                with (gzip.open if f.endswith('.gz') else open)(os.path.join(src, f), 'rb') as a, open(os.path.join(out, name), 'wb') as b:
                    shutil.copyfileobj(a, b)
        return out

    def tesseract(image, langs):
        from PIL import Image
        im = np.asarray(image)[..., :3]
        with tempfile.TemporaryDirectory() as tmp:
            f = os.path.join(tmp, 'crop.bmp')
            Image.fromarray(np.ascontiguousarray(im)).save(f)
            r = subprocess.run(['tesseract', f, 'stdout', '--tessdata-dir', tessdata(), '-l', '+'.join(langs), '--oem', '1',
                                '--psm', '6', '-c', 'preserve_interword_spaces=1', '-c', 'tessedit_create_tsv=1'], capture_output=True, text=True, check=True)
        words, confs = [], []
        rows = [line.split('\t') for line in r.stdout.splitlines()[1:]]
        text_lines, last = [], None
        for row in rows:
            if len(row) < 12:
                continue
            level, conf, word = int(row[0]), float(row[10]), row[11]
            key = tuple(row[2:5])
            if level == 5 and conf >= 0:
                confs.append(conf)
                if key != last:
                    text_lines.append([])
                    last = key
                text_lines[-1].append(word)
        text = '\n'.join(' '.join(w) for w in text_lines)
        return dict(text=text, confidence=float(np.mean(confs)) if confs else 0.0)

    @functools.lru_cache(None)
    def words():
        texts = []
        for rel in spec['words']:
            if '://' in rel:
                local = os.path.join(cache, 'words', os.path.basename(rel))
                if not os.path.exists(local):
                    os.makedirs(os.path.dirname(local), exist_ok=True)
                    with urllib.request.urlopen(rel) as r, open(local + '.part', 'wb') as f:
                        f.write(r.read())
                    os.replace(local + '.part', local)
                texts.append(open(local, encoding='utf-8').read())
            else:
                texts.append(open(path(rel), encoding='utf-8').read())
        return '\n'.join(texts)

    return dict(det=det, tesseract=tesseract, words=words)
