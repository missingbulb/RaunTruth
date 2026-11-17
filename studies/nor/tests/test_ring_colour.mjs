// The ring Edit History draws round an action's candidate (study.json's groundTruth.ring) is in a colour neither the image's
// channels nor anything the page draws over them carries: measured against the channels' own colours and each colour nor.css
// and nor.js use (the added NoRs' yellow is the shell's own, which is why the ring is not yellow). An image's own colours are
// not guarded beyond its three channels. Run: node tests/test_ring_colour.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

// two colours read apart when the cosine of the angle between them, as RGB, is under this
const APART = .9;
const here = new URL('.', import.meta.url);
const study = JSON.parse(fs.readFileSync(new URL('../study.json', here), 'utf8'));
// #rgb, #rgba, #rrggbb and #rrggbbaa as [r, g, b]
const rgb = (hex) => {
  const h = hex.slice(1), full = h.length <= 4 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const cos = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b) || 1);

assert.ok(study.groundTruth.ring, 'the study names its ring: the shell\'s own yellow is the colour of the added NoRs here');
const ring = rgb(study.groundTruth.ring);
const carried = (study.channels ?? []).filter((c) => c.colour).map((c) => [`channel ${c.name}`, rgb(c.colour)]);
const drawn = [];
for (const file of ['nor.css', 'nor.js']) {
  const text = fs.readFileSync(new URL(`../web/${file}`, here), 'utf8');
  for (const hex of new Set(text.match(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi) ?? [])) {
    const c = rgb(hex);
    if (c.every((v) => v === 0)) continue; // black has no hue to mistake
    drawn.push([`${hex} of ${file}`, c]);
  }
}
carried.push(...drawn);
assert.ok(carried.length >= 10 && drawn.length >= 7, `the channels' and the page's colours were read: ${carried.length}, ${drawn.length}`);
const near = carried.map(([what, c]) => [cos(ring, c), what]).sort((a, b) => b[0] - a[0]);
assert.ok(near[0][0] < APART, `the ring's colour is too near ${near[0][1]}: ${near[0][0].toFixed(3)} (and ${near.filter(([s]) => s >= APART).length - 1} more)`);
// the shell's yellow, which an added NoR is drawn in, is what the guard exists to refuse
assert.ok(carried.some(([, c]) => cos(rgb('#ffd400'), c) >= APART), 'the guard refuses the shell\'s own yellow');
console.log(`ok the ring's colour is apart from all ${carried.length} colours the image's channels and the page carry: nearest ${near[0][1]}, ${near[0][0].toFixed(3)}`);
