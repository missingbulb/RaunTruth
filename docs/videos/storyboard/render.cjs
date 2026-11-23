// Renders one cut of the built storyboard page to an MP4: every frame drawn at its time, the cut's soundtrack laid on.
//   node docs/videos/storyboard/render.cjs BUILT_DIR CUT OUT.mp4 [FPS] [--frames DIR --every SECONDS]
// --frames also writes a PNG every SECONDS for the audit.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

(async () => {
  const [dir, cut, out, fpsArg] = process.argv.slice(2);
  const fps = Number(fpsArg) || 30;
  const fi = process.argv.indexOf("--frames"), frames = fi > 0 ? process.argv[fi + 1] : null;
  const ei = process.argv.indexOf("--every"), every = ei > 0 ? Number(process.argv[ei + 1]) : 0;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: "light" });
  page.on("pageerror", e => { console.error("page error:", e.message); process.exitCode = 1; });
  await page.goto("file://" + path.resolve(dir, "storyboard.html") + "?render#" + cut);
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(id => VIDEOS.find(v => v.id === id).total, cut);
  const audio = path.resolve(dir, "audio", cut + ".mp3");
  const args = ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-"];
  if (fs.existsSync(audio)) args.push("-i", audio, "-c:a", "aac", "-b:a", "160k");
  args.push("-c:v", "libx264", "-preset", "slow", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-shortest", out);
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  if (frames) fs.mkdirSync(frames, { recursive: true });
  const n = Math.ceil(total * fps);
  let nextShot = 0;
  for (let k = 0; k < n; k++) {
    const t = k / fps;
    await page.evaluate(t => window.renderFrame(t), t);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (frames && every && t >= nextShot) {
      fs.writeFileSync(path.join(frames, `t${t.toFixed(2).padStart(7, "0")}.png`), await page.screenshot({ type: "png" }));
      nextShot += every;
    }
    if (k % (fps * 10) === 0) console.log(`${cut}: ${t.toFixed(0)} / ${total.toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  await browser.close();
  console.log("wrote", out);
})();
