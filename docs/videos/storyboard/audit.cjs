// Samples a cut's rendered frames for the audit: at each moment's middle and end, a 1920×1080 screenshot and every
// text element's box, size and fill as drawn on screen (camera included).
//   node docs/videos/storyboard/audit.cjs BUILT_DIR CUT OUT_DIR
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  const [dir, cut, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: "light" });
  await page.goto("file://" + path.resolve(dir, "storyboard.html") + "?render#" + cut);
  await page.evaluate(() => document.fonts.ready);
  const seq = await page.evaluate(id => VIDEOS.find(v => v.id === id).seq.map((s, i) => ({ i, at: s.at, dur: s.dur, kind: s.kind })), cut);
  const samples = [];
  for (const s of seq) {
    for (const [tag, f] of [["mid", 0.5], ["end", 0.97]]) {
      const t = s.at + s.dur * f;
      const texts = await page.evaluate(t => {
        window.renderFrame(t);
        return [...document.querySelectorAll("#stage text, #caption span")].map(el => {
          const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
          return { text: el.textContent, x: r.x, y: r.y, w: r.width, h: r.height, fill: cs.fill !== "none" && el.tagName === "text" ? cs.fill : cs.color,
                   size: r.height / 1.25, caption: el.tagName !== "text",
                   opacity: [...(function* (e) { while (e && e.nodeType === 1) { yield parseFloat(getComputedStyle(e).opacity); e = e.parentNode; } })(el)].reduce((a, b) => a * b, 1) };
        });
      }, t);
      const shot = `s${String(s.i).padStart(3, "0")}-${tag}.png`;
      await page.screenshot({ path: path.join(out, shot) });
      samples.push({ ...s, tag, t, shot, texts });
    }
  }
  const data = await page.evaluate(id => {
    const v = VIDEOS.find(v => v.id === id);
    return { id, total: v.total, mix: v.mix || {}, seq: v.seq, scenes: v.chapters.flatMap(c => c.scenes.map(s => ({ chapter: c.n, ...s }))) };
  }, cut);
  fs.writeFileSync(path.join(out, "samples.json"), JSON.stringify({ ...data, samples }, null, 1));
  await browser.close();
  console.log(`sampled ${samples.length} frames of ${cut} into ${out}`);
})();
