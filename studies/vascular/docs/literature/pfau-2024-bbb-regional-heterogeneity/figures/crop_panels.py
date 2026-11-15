#!/usr/bin/env python3
"""Regenerate panels/*.png from the full figure PNGs in this dir. Requires Pillow.

The main figures were rendered from the PDF at 300 dpi, which is the native resolution of their
embedded photomicrographs; the Extended Data figures are the PDF's own embedded page rasters,
also 300 dpi. Grid geometry was located automatically from the dark image bands (black-background
micrographs on a white page), then frozen here so the crop is reproducible. See panels/README.md.

Only the CD31 single-channel column of each figure is a working-dataset input (VESSEL_). The paper
tag `pfau24` keeps the calibration keys in the analysis unique across papers.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'panels')
M = 3                      # inner trim (px) to avoid edge bleed
os.makedirs(OUT, exist_ok=True)

# (figure file, (x0, x1, y0, y1), panel name). Each box is one CD31 panel.
PANELS = [
    # Fig 1a: U.Clear volume, CD31 column; the 100 um bar is drawn on the cortex row only.
    ('fig1_me_vs_cortex_vessel_morphology.png', (235, 512, 43, 319), 'VESSEL_pfau24fig1a_cortex_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (235, 512, 324, 601), 'VESSEL_pfau24fig1a_ME_CD31'),
    # Fig 1b: CD31 column of the CD31/MFSD2A panel; 10 um bar on the cortex row only.
    ('fig1_me_vs_cortex_vessel_morphology.png', (1192, 1467, 45, 320), 'VESSEL_pfau24fig1b_cortex_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (1192, 1467, 325, 601), 'VESSEL_pfau24fig1b_ME_CD31'),
    # Fig 1c: the capillary-diameter images; cortex and ME side by side in one row, one 20 um bar.
    ('fig1_me_vs_cortex_vessel_morphology.png', (235, 517, 684, 965), 'VESSEL_pfau24fig1c_cortex_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (529, 810, 684, 965), 'VESSEL_pfau24fig1c_ME_CD31'),
    # Fig 3c: CD31 column of the CD31/EMCN panel; 10 um bar on the cortex row only.
    ('fig3_me_specific_capillary_ecs.png', (289, 533, 633, 877), 'VESSEL_pfau24fig3c_cortex_CD31'),
    ('fig3_me_specific_capillary_ecs.png', (289, 533, 880, 1124), 'VESSEL_pfau24fig3c_ME_CD31'),
    # Extended Data Fig 1a: CD31 column of the tracer panel; 10 um bar on the cortex row only.
    ('edfig1_vascular_differences.png', (50, 387, 69, 406), 'VESSEL_pfau24ed1a_cortex_CD31'),
    ('edfig1_vascular_differences.png', (50, 387, 409, 745), 'VESSEL_pfau24ed1a_ME_CD31'),
    # Extended Data Fig 1d: CD31 column of the CD31/CLDN5 panel; 10 um bar on the cortex row only.
    ('edfig1_vascular_differences.png', (1144, 1480, 821, 1158), 'VESSEL_pfau24ed1d_cortex_CD31'),
    ('edfig1_vascular_differences.png', (1144, 1480, 1165, 1501), 'VESSEL_pfau24ed1d_ME_CD31'),
    # Extended Data Fig 2d: CD31 column of the CD31/AQP4 panel, cortex row (20 um bar).
    ('edfig2_tem_and_aqp4.png', (97, 435, 2007, 2346), 'VESSEL_pfau24ed2d_cortex_CD31'),
    # Extended Data Fig 5a: CD31 column of the CD31/aSMA overview; 100 um bar on the cortex row only.
    ('edfig5_arteries_and_validation.png', (53, 385, 57, 390), 'VESSEL_pfau24ed5a_cortex_CD31'),
    ('edfig5_arteries_and_validation.png', (53, 385, 400, 732), 'VESSEL_pfau24ed5a_ME_CD31'),
    # Extended Data Fig 5b: CD31 column of the CD31/aSMA close-up; 20 um bar on the cortex row only.
    ('edfig5_arteries_and_validation.png', (1159, 1492, 46, 378), 'VESSEL_pfau24ed5b_cortex_CD31'),
    ('edfig5_arteries_and_validation.png', (1159, 1492, 388, 720), 'VESSEL_pfau24ed5b_ME_CD31'),
]

for fn, (x0, x1, y0, y1), name in PANELS:
    im = Image.open(os.path.join(HERE, fn)).convert('RGB')
    im.crop((x0 + M, y0 + M, x1 - M, y1 - M)).save(os.path.join(OUT, name + '.png'))

print('done ->', OUT)
