// The ring Edit History draws round an action's book (study.json's groundTruth.ring) is in a colour neither the photo's
// channels nor anything the page draws over it carries: measured against the channels' own colours and each colour
// shelves.css and shelves.js draw in (the current book's outline and corners are the shell's own yellow, which is why the
// ring is not). A photo's own colours are not guarded: any cover can carry any. Run: node tests/test_ring_colour.mjs
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

assert.ok(study.groundTruth.ring, 'the study names its ring: the shell\'s own yellow is the colour of the current book\'s outline here');
const ring = rgb(study.groundTruth.ring);
const carried = (study.channels ?? []).filter((c) => c.colour).map((c) => [`channel ${c.name}`, rgb(c.colour)]);
const drawn = [];
for (const file of ['shelves.css', 'shelves.js']) {
  const text = fs.readFileSync(new URL(`../web/${file}`, here), 'utf8');
  for (const hex of new Set(text.match(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi) ?? [])) {
    const c = rgb(hex);
    if (c.every((v) => v === 0)) continue; // black has no hue to mistake
    drawn.push([`${hex} of ${file}`, c]);
  }
}
carried.push(...drawn);
assert.ok(carried.length >= 8 && drawn.length >= 4, `the channels' and the page's colours were read: ${carried.length}, ${drawn.length}`);
const near = carried.map(([what, c]) => [cos(ring, c), what]).sort((a, b) => b[0] - a[0]);
assert.ok(near[0][0] < APART, `the ring's colour is too near ${near[0][1]}: ${near[0][0].toFixed(3)} (and ${near.filter(([s]) => s >= APART).length - 1} more)`);
// the shell's yellow, which the current book is drawn in, is what the guard exists to refuse
assert.ok(carried.some(([, c]) => cos(rgb('#ffd400'), c) >= APART), 'the guard refuses the shell\'s own yellow');
console.log(`ok the ring's colour is apart from all ${carried.length} colours the photo's channels and the page carry: nearest ${near[0][1]}, ${near[0][0].toFixed(3)}`);

// req/shelves/truth/fields: the fields always shown, Title and Author, apart from each other and from the current book's
// yellow, so the outline of where each was read is told from the other's and from the book's own; the other fields'
// letters tell them, five colours all apart being more than the ring and the yellow leave room for
const js = fs.readFileSync(new URL('../web/shelves.js', here), 'utf8');
const field = (k) => rgb(new RegExp(`${k}: \\{[^}]*colour: "(#[0-9a-f]{6})"`, 'i').exec(js)?.[1] ?? '#000');
const [title, author] = [field('title'), field('author')];
assert.ok(title.some(Boolean) && author.some(Boolean), 'the title\'s and the author\'s colours were read');
for (const [what, c] of [['each other', author], ['the current book\'s yellow', rgb('#ffd400')]]) {
  assert.ok(cos(title, c) < APART, `the title's colour is too near ${what}`);
}
assert.ok(cos(author, rgb('#ffd400')) < APART, 'the author\'s colour is too near the current book\'s yellow');
console.log('ok the title\'s and the author\'s colours are apart from each other and from the current book\'s yellow');
