// The world a page test sets up, said in the test's own terms: who the users are and what Google lets them do, what
// their Drive holds and how it answers, how the site is deployed and its studies are set, and the devices they open
// the page on, each holding what it kept before. One world for a browser's every context, as the fakes are
// (fakes/index.mjs); a device is a context of its own. Each call returns its own subject, so a set-up reads as one
// sentence; what is left unsaid is the common case.
//   const w = world(browser, origin);
//   w.site.withGoogle();                                  the deploy's variables (fakes/site_settings.mjs)
//   w.studies.atStage("nor", "PostGT");                   the studies as served (fakes/studies.mjs)
//   const ada = w.user("ada@acme.example").named("Ada").without(DRIVE_FILE).savedSettings({ "nor-theme": "dark" }).tags("nor");
//   w.drive.folder({ name, parent });                     what Drive holds (fakes/google_drive.mjs)
//   const page = await w.device().signedInAs(ada).asRole("tagger").keeps({ "nor-motion": "false" }).opens("nor");
//   w.device().kept()                                     a browser profile of its own, for what Playwright's WebKit
//     empties from a throwaway context (harness.mjs's keptContext)
// A device, unless told: no one signed in, the opening popup answered (google signed in, else anonymous), the site's
// worker gone, 1400x900, and a page that waits until the study says Ready. opens() alone is the site's own address.
import { driveIn } from "./fakes/google_drive.mjs";
import { SCOPES, signInIn } from "./fakes/google_sign_in.mjs";
import { settingsIn } from "./fakes/site_settings.mjs";
import { studiesIn } from "./fakes/studies.mjs";
import { pw, keptContext, worldOf } from "./harness.mjs";
import { STEP } from "./deadlines.mjs";

export const DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
// what a page waits on before a test goes on: the study's Python ready, the page's title drawn, or nothing
const UNTIL = {
  ready: (page) => page.waitForFunction(() => document.querySelector("#status")?.textContent.startsWith("Ready")),
  title: (page) => page.waitForFunction(() => document.querySelector("#title")?.textContent),
  none: async () => {},
};

export function world(browser, origin) {
  const shared = worldOf(browser), drive = driveIn(shared), google = signInIn(shared);
  return {
    browser, drive, google, site: settingsIn(shared), studies: studiesIn(shared),

    // a Google account, the one Google's window signs in next
    user(email) {
      let name = email, withheld = [];
      google.answersAs({ email, name });
      const user = {
        email,
        get name() { return name; },
        get scopes() { return SCOPES.split(" ").filter((s) => !withheld.includes(s)).join(" "); },
        named(n) { name = n; google.answersAs({ email, name }); return user; },
        // a scope Google leaves out of their token, its box unticked
        without(...scopes) { withheld = scopes; google.withhold = scopes; return user; },
        // the settings file another device of theirs left on Drive
        savedSettings(record) { google.savedSettings(email, record); return user; },
        // Drive's sharing lets them add to the study's submissions folder, which makes them its tagger
        tags(study) {
          const root = drive.rootOf(study);
          const subs = drive.files.find((f) => f.parent === root.id && f.name === "GT submissions") || drive.folder({ name: "GT submissions", parent: root.id });
          drive.writableBy(subs, email);
          return user;
        },
        // Drive's sharing lets them add to the folder, which makes them its study's manager
        manages(folder) { drive.writableBy(folder, email); return user; },
      };
      return user;
    },

    device() {
      const kept = {}, options = { viewport: { width: 1400, height: 900 } };
      const cached = [];
      let who = null, left = 3599e3, welcome, drafts = [], worker = false, profile = false, ctx = null;
      const device = {
        // signed in on the device, Google's token lasting left ms
        signedInAs(user, { tokenLeft = left } = {}) { who = user; left = tokenLeft; return device; },
        // the opening popup's answer kept ("google", "anonymous"), or null for none yet
        welcomed(answer) { welcome = answer; return device; },
        asRole(role) { kept["nor-role"] = role; return device; },
        keeps(keys) { Object.assign(kept, keys); return device; },
        // ground-truth drafts kept, as device_storage.mjs reads them back
        keepsDrafts(records) { drafts = records; return device; },
        // the Drive dialog's folder link kept from before
        remembersDriveLink(folder) { kept["nor-drive-link"] = JSON.stringify(`https://drive.google.com/drive/folders/${folder.id ?? folder}`); return device; },
        // entries of a cache the page keeps ({ url, bytes, headers }), there before the page reads it; the page's
        // window.worldCached settles once they are
        keepsCached(cache, entries) {
          cached.push(...entries.map((e) => ({ cache, url: e.url, headers: e.headers || {}, bytes: Buffer.from(e.bytes).toString("base64") })));
          return device;
        },
        withWorker() { worker = true; return device; },
        kept() { profile = true; return device; },
        // the browser context's own options (a viewport, a user agent, a clock)
        with(more) { Object.assign(options, more); return device; },
        // the device's browser context, made on first need with all it holds
        async context() {
          if (ctx) return ctx;
          ctx = profile ? await keptContext(pw, options, shared) : await browser.newContext(options);
          const seed = { ...kept };
          if (who) seed["nor-google-sign-in"] = JSON.stringify(google.signedIn({ email: who.email, name: who.name, scopes: who.scopes, until: Date.now() + left }));
          const answer = welcome === undefined ? (who ? "google" : "anonymous") : welcome;
          if (answer) seed["nor-welcome"] = JSON.stringify({ choice: answer, remember: true });
          // written once a tab, before any script of the page's runs, so a page that changes it keeps its change
          await ctx.addInitScript(([seed, drafts, worker, cached]) => {
            if (!worker) delete Navigator.prototype.serviceWorker;
            if (window !== window.top || sessionStorage.getItem("world-kept")) return;
            sessionStorage.setItem("world-kept", "1");
            for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
            window.worldCached = Promise.all(cached.map((e) => caches.open(e.cache).then((c) =>
              c.put(e.url, new Response(Uint8Array.from(atob(e.bytes), (ch) => ch.charCodeAt(0)), { headers: e.headers })))));
            if (!drafts.length) return;
            const q = indexedDB.open("gt-drafts", 1);
            q.onupgradeneeded = () => q.result.createObjectStore("drafts", { keyPath: ["study", "sha256"] });
            q.onsuccess = () => {
              const t = q.result.transaction("drafts", "readwrite");
              for (const r of drafts) t.objectStore("drafts").put(r);
              t.oncomplete = t.onabort = () => q.result.close();
            };
          }, [seed, drafts, worker, cached]);
          return ctx;
        },
        // a page on the study's own address, or the site's with none; until: ready, title or none
        async opens(study, { until = "ready" } = {}) {
          const c = await device.context(), blank = c.pages().find((p) => p.url() === "about:blank");
          const page = blank || await c.newPage();
          page.setDefaultTimeout(STEP);
          await page.goto(`${origin}/web/${study ?? ""}`);
          await UNTIL[until](page);
          return page;
        },
        // a page on an address of the site's as a visitor has it (an old one, one with a query), until as opens()
        async visits(address, { until = "ready" } = {}) {
          const c = await device.context(), page = c.pages().find((p) => p.url() === "about:blank") || await c.newPage();
          page.setDefaultTimeout(STEP);
          await page.goto(origin + address);
          await UNTIL[until](page);
          return page;
        },
        close: () => ctx?.close(),
      };
      return device;
    },
  };
}
