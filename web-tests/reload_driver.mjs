// Drives the page (web/) with a worker that says nothing and checks what a reload hands it (req/shell/browsers/supported):
// every control the page's markup starts off comes back off, whatever the page had made of it before. Firefox keeps
// each control's disabled state over a reload, as it keeps what a form's fields hold, unless the control says not to.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/reload_driver.mjs
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { STEP } from "./deadlines.mjs";

const CONTROLS = "button, select, input, textarea, fieldset";
const { origin, server } = await serveSite({ "/web/worker.js": "" });
const browser = await launch(pw);
try {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript((CONTROLS) => {
    delete Navigator.prototype.serviceWorker;
    // the controls as the browser hands them over, the markup read and none of the page's scripts run yet
    document.addEventListener("readystatechange", () => {
      if (document.readyState === "interactive") window.handed = [...document.querySelectorAll(CONTROLS)].map((e) => ({ name: e.id || e.outerHTML.slice(0, 60), off: e.disabled }));
    });
  }, CONTROLS);
  const page = await ctx.newPage();
  page.setDefaultTimeout(STEP);
  const handed = async () => { await page.waitForFunction(() => document.querySelector("#title").textContent); return page.evaluate(() => window.handed); };
  await page.goto(origin + "/web/");
  const first = await handed(), off = first.filter((c) => c.off);
  check(off.length >= 8, `the page's markup starts ${off.length} controls off`, off.map((c) => c.name));
  // each of them on, as the page turns each on in its time
  await page.evaluate((CONTROLS) => { for (const e of document.querySelectorAll(CONTROLS)) e.disabled = false; }, CONTROLS);
  await page.reload();
  const again = await handed();
  check(again.length === first.length, "a reload hands the page the same controls", [first.length, again.length]);
  const on = first.filter((c, i) => c.off && !again[i]?.off).map((c) => c.name);
  check(!on.length, "after a reload, every control the markup starts off is handed to the page off, though each was on before it", on);
} finally {
  await browser.close(); server.close();
}
