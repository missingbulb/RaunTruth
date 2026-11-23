// The world a test sets up (world.mjs), as the page meets it: a device keeps the keys it was given, and opens on them;
// a user signed in on it is who the page names, its token may do only the scopes it was signed in with, what the page learned for them is kept with it, and the
// settings another device of theirs left on Drive are the ones it takes; a device with no one signed in is the
// device's own; a kept device holds the cache entries it was given; a public folder holds the image it was given, a file given at Drive's top is in no folder, and a folder the site made is the site's, one named by its id holding what a test puts in it; a folder's sharing said afresh is the one Drive lists; a device visits an address as given; a deploy
// with no Google client offers no sign-in.
//   node web-tests/world_driver.mjs
import { pw, launch, check, expecting } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { image } from "./images.mjs";
import { pressDrive } from "./drive_open.mjs";

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

  // the token the device was signed in with, the first Google knew of after the ones before it
  const known = new Set(w.google.tokens.keys()), narrow = w.device().signedInAs(ada, { scopes: "openid email" });
  await narrow.opens("fixture", { until: "title" });
  const held = [...w.google.tokens].find(([t]) => !known.has(t))?.[1].scopes;
  check(held === "openid email", "a device signed in with fewer scopes keeps a token that may do only those", held);
  await narrow.close();

  // what the page learned of the studies she may open, kept with her run-out sign-in
  const knowing = w.device().signedInAs(ada, { tokenLeft: -1, learned: { members: ["fixture"] } });
  const learned = await (await knowing.opens("fixture", { until: "title" })).evaluate(() => JSON.parse(localStorage.getItem("nor-google-sign-in"))?.learned);
  check(learned?.members?.join() === "fixture", "a device signed in with what the page learned for her keeps it with the sign-in", learned);
  await knowing.close();

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

  const visitor = w.device();
  const typed = await visitor.visits("/web/fixture?from=typed", { until: "title" });
  check(new URL(typed.url()).search === "?from=typed" && await typed.textContent("#title"), "a device visits an address as given", typed.url());
  await visitor.close();

  w.site.withoutGoogleClient();
  const cache = w.folder("Cache").public();
  const aPng = cache.holds(image.png("a.png", { width: 64 }));
  const lister = w.device().remembersDriveLink(cache);
  const shelf = await lister.opens(undefined, { until: "title" });
  await pressDrive(shelf);
  await shelf.waitForFunction(() => document.querySelectorAll("#remote-list .item").length);
  const listed = await shelf.$$eval("#remote-list .item", (rs) => rs.map((r) => [r.dataset.id, r.textContent.trim()]));
  check(listed.length === 1 && listed[0][0] === aPng.id && listed[0][1].includes("a.png"), "a public folder holds the image it was given, and the Drive dialog lists it", listed);
  await shelf.dblclick("#remote-list .item");
  await shelf.waitForFunction(() => window.st?.fileName === "a.png");
  check(true, "and opens it");
  await lister.close();
  const top = w.file(image.bytes("top.vsi", 4));
  check(top.parent === null && w.drive.get(top.id) === top && top.bytes.length === 4, "a file given at Drive's top is in no folder", top);
  const made = w.folder("Made", { bySite: true }), given = w.of(made.id).folder("Given");
  check(made.record.mine && !given.record.mine && given.record.parent === made.id, "a folder the site made is the site's, and one a test puts in it, by its id, is not", [made.record, given.record]);

  // a folder's sharing said afresh, as Drive lists it to the site's key: the link and x, then the link alone, then not the link
  const shared = w.folder("Shared").readableBy("x@acme.example").public(), asker = w.device();
  const onAsker = await asker.opens("fixture", { until: "title" });
  const sharing = () => onAsker.evaluate((id) => fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions?key=site&fields=permissions(type,emailAddress)`)
    .then((r) => (r.ok ? r.json().then((j) => j.permissions.map((p) => p.emailAddress ?? p.type).join()) : r.status)), shared.id);
  const both = await sharing();
  const linkAlone = await (shared.namesNoOne(), sharing());
  const notLink = await expecting(/status of 404/, () => (shared.private(), sharing()));
  check(both === "anyone,x@acme.example" && linkAlone === "anyone" && notLink === 404,
    "a folder that names no one after naming x lists the link's permission alone, and made private the site's key reads it not", [both, linkAlone, notLink]);
  check(w.of(shared.record).id === shared.id, "a handle on a folder the fake holds is that folder");
  await asker.close();

  const keyOnly = w.device();
  const bare = await keyOnly.opens("fixture", { until: "title" });
  check(await bare.evaluate(() => document.querySelector("#sign-in").hidden), "a deploy with no Google client offers no sign-in");
  await keyOnly.close();
} finally {
  await browser.close(); server.close();
}
