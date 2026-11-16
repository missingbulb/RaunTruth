# Raw data — where it lives and how to get it

The microscope files are **not in this repository**. They live in the study's Google Drive root,
[`Microglia`](https://drive.google.com/drive/folders/1XCcmpzU8D1JBoIZvpITMS7sik-zZrASn) (shared
"Anyone with the link"), in `Data/`; the articles are in `Literature/` and are taken into
[`../docs/literature/`](../docs/literature/README.md).

Fetch the whole root into the scratchpad (it is small) and read an image:

```
pip install gdown slideio
python3 -c "import gdown; gdown.download_folder(id='1XCcmpzU8D1JBoIZvpITMS7sik-zZrASn', output='microglia-drive')"
python3 studies/microglia/py/read_vsi.py "microglia-drive/Data/20250728_HIPP  iba1_488 cd68_555x20 11-2_current_3666.vsi"
```

What the files are and what was found in them: [`../docs/DATA-REVIEW.md`](../docs/DATA-REVIEW.md).

## Sources

| file (under `Data/`) | Drive id | SHA-256 | what |
|---|---|---|---|
| `20250728_HIPP  iba1_488 cd68_555x20 11-2_current_3666.vsi` (two spaces after `HIPP`) | `1KGQQ6y4GDPsfnyy6IxUua7P4WVCkB9CJ` | `b230bf64fb38a4dc56a2b5ed41e0a644de39ef98c87d9891e80be123447a1a78` | cellSens container: metadata only, 268 KB |
| `_20250728_HIPP  iba1_488 cd68_555x20 11-2_current_3666_/stack1/frame_t_0.ets` | `180cTRy6hsqm7eJ2D28IyGcU1T8VmnxLi` | `2603e550061c39d03fffb7f80dac57eec5c8cdfd76696e31a5d1b8d50751c147` | the pixels: 2048 × 2048 × 3 channels, uint16, uncompressed, 25 MB |

Both files are needed: the `.vsi` names the image and its calibration, and the `.ets` beside it, in
a folder named `_<vsi name>_`, holds the pixels. Download them together and keep the names; a
reader finds the `.ets` from the `.vsi`'s name.
