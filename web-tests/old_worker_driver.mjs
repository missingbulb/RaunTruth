// Drives a browser that ran the app at the site's top, with its service worker registered there (OLD_SW, the
// worker as it was), then the built site (SITE), and checks req/shell/site/app-address: the first visit to / shows the landing page and
// ends that registration, and /app/ registers its own.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/old_worker_driver.mjs SITE OLD_SW
import fs from "node:fs";
import { until, orMissed } from "./page_until.mjs";
import { pw, launch, check, expecting } from "./harness.mjs";
import { serveSite, AS_SERVED } from "./site_server.mjs";
import { world } from "./world.mjs";
import { ENGINE } from "./engine.mjs";

const [site, oldSw] = process.argv.slice(2);
let before = true;
// before: the app at the top, registering the old worker; after: the built site, as the host serves it
const { origin, server } = await serveSite({
  "/": (q, u) => (!before ? AS_SERVED
    : u === "/sw.js" ? { type: "text/javascript", body: fs.readFileSync(oldSw) }
    : u === "/" ? { type: "text/html", body: '<!doctype html><title>the app at the top</title><script>navigator.serviceWorker.register("sw.js")</script>' }
    : null),
}, { built: site });

const browser = await launch(pw), device = world(browser, origin).device().kept().withWorker();
const page = await device.visits("/", { until: "none" }), ctx = page.context();
const scopes = () => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname));
try {
  await until(page, async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 15000 });
  await page.reload(); // visits again on purpose (a reload is the subject): a worker controls only a page loaded after it took over
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), "before: the old worker controls the site's top");
  before = false;
  await device.visits("/", { in: page, until: "none" });
  const title = await page.title();
  check(!!(await page.$('a[href="app/"]')), "after: / shows the landing page: " + title);
  await orMissed(until(page, async () => !(await navigator.serviceWorker.getRegistrations()).length));
  const left = await scopes();
  check(!left.length, "after: the old registration is gone: " + JSON.stringify(left));
  // Playwright answers a service worker's requests with a test's routes in Chromium alone: elsewhere, once the app's
  // worker is in control, what the page asks of the CDN through it reaches no fake, fails, and the page says so
  const throughWorker = (run) => (ENGINE === "chromium" ? run() : expecting(/pyodide|Load failed|NetworkError/, run, { maybe: true }));
  await throughWorker(async () => {
    await device.visits("/app/", { in: page, until: "none" });
    await orMissed(until(page, async () => (await navigator.serviceWorker.getRegistrations()).some((r) => new URL(r.scope).pathname === "/app/"), null, { timeout: 15000 }));
    // the app also registers its address with no slash (req/shell/offline/default), which may land before or after this
    const now = await scopes();
    check(now.includes("/app/") && now.every((s) => s === "/app/" || s === "/app"), "after: /app/ registers its own worker, none outside the app: " + JSON.stringify(now));
    await page.close();
  });
} finally {
  await ctx.close(); await browser.close(); server.close();
}
