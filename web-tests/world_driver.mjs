// The world a test sets up (world.mjs), as the page meets it: a device keeps the keys it was given, and opens on them;
// a user signed in on it is who the page names, and the settings another device of theirs left on Drive are the ones
// it takes; a device with no one signed in is the device's own; a deploy with no Google client offers no sign-in.
//   node web-tests/world_driver.mjs
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";

const { origin, server } = await serveSite({ "/web/worker.js": "" });
const browser = await launch(pw), w = world(browser);
const at = origin + "/web/fixture";
try {
  w.site.withGoogle();

  const kept = await w.device({ keys: { "nor-motion": "false" } });
  const motion = await (await kept.open(at, { until: "title" })).evaluate(() => document.documentElement.dataset.motion);
  check(motion === "off", "a device opens on the keys it keeps", motion);
  await kept.close();

  const ada = w.user("ada@acme.example", { name: "Ada Lovelace" });
  ada.savedSettings({ "nor-theme": "dark" });
  const hers = await w.device({ signedIn: ada });
  const page = await hers.open(at, { until: "title" });
  check(await page.textContent("#who-name") === "Ada Lovelace", "a user signed in on a device is who the page names", await page.textContent("#who-name"));
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  check(true, "and the settings another device of theirs left on Drive are the ones it takes");
  await hers.close();

  const nobody = await w.device();
  const own = await nobody.open(at, { until: "title" });
  check(await own.textContent("#who-where") === "On this device, not signed in", "a device no one signed in on is its own", await own.textContent("#who-where"));
  check(await own.isVisible("#sign-in") || await own.evaluate(() => !document.querySelector("#sign-in").hidden), "and offers Sign in with Google");
  await nobody.close();

  w.site.withoutGoogleClient();
  const keyOnly = await w.device();
  const bare = await keyOnly.open(at, { until: "title" });
  check(await bare.evaluate(() => document.querySelector("#sign-in").hidden), "a deploy with no Google client offers no sign-in");
  await keyOnly.close();
} finally {
  await browser.close(); server.close();
}
