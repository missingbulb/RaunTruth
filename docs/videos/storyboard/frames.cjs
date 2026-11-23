// Exports a cut's frames for editing in another tool: each moment's first and last frame as a 1920×1080 PNG
// (no camera move, no subtitle) and as a standalone SVG with its colours and fonts written in.
//   node docs/videos/storyboard/frames.cjs BUILT_DIR CUT OUT_DIR
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
  const list = await page.evaluate(id => {
    const v = VIDEOS.find(v => v.id === id);
    return v.seq.filter(s => s.kind === "moment").map(s => {
      const sc = v.chapters[s.ref[0]].scenes[s.ref[1]], m = sc.moments[s.ref[2]];
      return { at: s.at, dur: s.dur, scene: sc.n, moment: m.moment, k: s.ref[2] + 1 };
    });
  }, cut);
  for (const f of list) {
    const slug = `${String(f.scene).padStart(2, "0")}.${f.k}-${f.moment.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    for (const [tag, x] of [["start", 0.03], ["end", 0.97]]) {
      const svgText = await page.evaluate(([t]) => {
        window.renderFrame(t);
        document.getElementById("caption").innerHTML = "";
        const cam = document.querySelector("#stage .cam");
        cam.getAnimations().forEach(a => a.cancel());
        cam.style.animation = "none"; cam.style.transform = "none";
        const src = cam.querySelector("svg"), copy = src.cloneNode(true);
        const a = [src, ...src.querySelectorAll("*")], b = [copy, ...copy.querySelectorAll("*")];
        a.forEach((el, i) => {
          const cs = getComputedStyle(el), c = b[i];
          for (const p of ["fill", "stroke", "stroke-width", "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight", "letter-spacing"])
            if (cs.getPropertyValue(p)) c.setAttribute(p, cs.getPropertyValue(p));
          c.removeAttribute("class");
        });
        copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        copy.setAttribute("width", "1920"); copy.setAttribute("height", "1080");
        return copy.outerHTML;
      }, [f.at + f.dur * x]);
      await page.screenshot({ path: path.join(out, `${slug}-${tag}.png`) });
      fs.writeFileSync(path.join(out, `${slug}-${tag}.svg`), svgText);
    }
  }
  await browser.close();
  console.log(`exported ${list.length} moments of ${cut} into ${out}`);
})();
