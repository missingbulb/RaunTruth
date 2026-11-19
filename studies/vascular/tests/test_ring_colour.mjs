// The ring Edit History draws round an action's item (study.json's groundTruth.ring, else the shell's yellow) is in a
// colour neither the stack nor the model carries: measured against every depth palette along its depth, the channels'
// own colours and each colour the model and the widths are drawn in. Run: node tests/test_ring_colour.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PALETTES, paletteAt, rgb } from '../../../web/depth_palettes.js';

const SHELL_RING = '#ffd400';
// two colours read apart when the cosine of the angle between them, as RGB, is under this
const APART = .9;
const here = new URL('.', import.meta.url);
const study = JSON.parse(fs.readFileSync(new URL('../study.json', here), 'utf8'));
const ring = rgb(study.groundTruth.ring ?? SHELL_RING);
const cos = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b) || 1);

const carried = [];
for (const key of Object.keys(PALETTES)) for (let k = 0; k <= 100; k++) carried.push([`${key} at ${k}% of the depth`, paletteAt(key, k / 100)]);
for (const c of study.channels ?? []) if (c.colour) carried.push([`channel ${c.id ?? c.name}`, rgb(c.colour)]);
let drawn = 0;
for (const file of ['model_view.js', 'widths.js']) {
  for (const hex of new Set(fs.readFileSync(new URL(`../web/${file}`, here), 'utf8').match(/#[0-9a-f]{6}\b/gi) ?? [])) {
    if (/^#0{6}$/.test(hex)) continue; // black has no hue to mistake
    carried.push([`${hex} of ${file}`, rgb(hex)]); drawn++;
  }
}
assert.ok(carried.length > 400 && drawn >= 8, `the palettes and the model's colours were read: ${carried.length}, ${drawn}`);
const near = carried.map(([what, c]) => [cos(ring, c), what]).sort((a, b) => b[0] - a[0]);
assert.ok(near[0][0] < APART, `the ring's colour is too near ${near[0][1]}: ${near[0][0].toFixed(3)} (and ${near.filter(([s]) => s >= APART).length - 1} more)`);
console.log(`ok the ring's colour is apart from all ${carried.length} colours the stack and the model carry: nearest ${near[0][1]}, ${near[0][0].toFixed(3)}`);
