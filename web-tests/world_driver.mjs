// The world a test sets up (world.mjs), as the page meets it: a device keeps the keys it was given, and opens on them;
// a user signed in on it is who the page names, and the settings another device of theirs left on Drive are the ones
// it takes; a device with no one signed in is the device's own; a kept device holds the cache entries it was given; a deploy with no Google client offers no sign-in.
//   node web-tests/world_driver.mjs
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";

const { origin, server } = await serveSite({ "/web/worker.js": "" });
const browser = await launch(pw), w = world(browser, origin);
try {
  w.site.withGoogle();

  const kept = w.device().keeps({ "nor-motion": "false" });
  const motion = await (await kept.opens("fixture", { until: "title" })).evaluate(() => document.documentElement.dataset.motion);
  check(motion === "off", "a device opens on the keys it keeps", motion);
  await kept.close();

  const ada = w.user("ada@acme.example").named("Ada Lovelace").savedSettings({ "nor-theme": "dark" });
  const hers = w.device().signedInAs(ada);
  const page = await hers.opens("fixture", { until: "title" });
  check(await page.textContent("#who-name") === "Ada Lovelace", "a user signed in on a device is who the page names", await page.textContent("#who-name"));
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  check(true, "and the settings another device of theirs left on Drive are the ones it takes");
  await hers.close();

  const nobody = w.device();
  const own = await nobody.opens("fixture", { until: "title" });
  check(await own.textContent("#who-where") === "On this device, not signed in", "a device no one signed in on is its own", await own.textContent("#who-where"));
  check(await own.isVisible("#sign-in") || await own.evaluate(() => !document.querySelector("#sign-in").hidden), "and offers Sign in with Google");
  await nobody.close();

  const profile = w.device().kept().keepsCached("acme-cache", [{ url: origin + "/acme.bin", bytes: [1, 2, 3], headers: { "x-acme": "one" } }]);
  const there = await (await profile.opens("fixture", { until: "title" })).evaluate(async (u) => {
    await window.worldCached;
    const r = await (await caches.open("acme-cache")).match(u);
    return r && { bytes: [...new Uint8Array(await r.arrayBuffer())], header: r.headers.get("x-acme") };
  }, origin + "/acme.bin");
  check(there?.bytes.join() === "1,2,3" && there.header === "one", "a kept device holds the cache entries it was given", there);
  await profile.close();

  w.site.withoutGoogleClient();
  const keyOnly = w.device();
  const bare = await keyOnly.opens("fixture", { until: "title" });
  check(await bare.evaluate(() => document.querySelector("#sign-in").hidden), "a deploy with no Google client offers no sign-in");
  await keyOnly.close();
} finally {
  await browser.close(); server.close();
}
