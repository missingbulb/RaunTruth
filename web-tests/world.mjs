// The world a page test sets up, said in the test's own terms: who the users are and what Google lets them do, what
// their Drive holds and how it answers, how the site is deployed and its studies are set, and the devices they open
// the page on, each holding what it kept before. One world for a browser's every context, as the fakes are
// (fakes/index.mjs); a device is a context of its own.
//   const w = world(browser);
//   w.site.withGoogle();                                  the deploy's variables (fakes/site_settings.mjs)
//   w.studies.atStage("nor", "PostGT");                   the studies as served (fakes/studies.mjs)
//   const ada = w.user("ada@acme.example", { name, scopes, without: [DRIVE_FILE] });   a Google account
//   ada.savedSettings({ "nor-theme": "dark" });           the settings file another device of theirs left on Drive
//   ada.tags("nor");  ada.manages(folder);                Drive's sharing makes them a tagger, a study manager
//   const f = w.drive.folder({ name, parent });  w.drive.file({ name, parent: f.id, bytes });   (fakes/google_drive.mjs)
//   const d = await w.device({ signedIn: ada, role: "tagger", keys: { "nor-motion": "false" }, drafts });
//   const page = await d.open(origin + "/web/nor");       waits until the study says Ready, unless until says otherwise
import { driveIn } from "./fakes/google_drive.mjs";
import { SCOPES, signInIn } from "./fakes/google_sign_in.mjs";
import { settingsIn } from "./fakes/site_settings.mjs";
import { studiesIn } from "./fakes/studies.mjs";
import { worldOf } from "./harness.mjs";
import { STEP } from "./deadlines.mjs";

export const DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
// what the page waits on before a test goes on: the study's Python ready, the page's title drawn, or nothing
const UNTIL = {
  ready: (page) => page.waitForFunction(() => document.querySelector("#status")?.textContent.startsWith("Ready")),
  title: (page) => page.waitForFunction(() => document.querySelector("#title")?.textContent),
  none: async () => {},
};

export function world(browser) {
  const shared = worldOf(browser), drive = driveIn(shared), google = signInIn(shared);
  const w = {
    browser, drive, google, site: settingsIn(shared), studies: studiesIn(shared),
    // a Google account, Google's window signing it in next; scopes: what its token may do, without those left out
    user(email, { name = email, scopes = SCOPES, without = [] } = {}) {
      google.answersAs({ email, name });
      google.withhold = without;
      const granted = scopes.split(" ").filter((s) => !without.includes(s)).join(" ");
      return {
        email, name, scopes: granted,
        savedSettings: (record) => google.savedSettings(email, record),
        tags(study) {
          const root = drive.rootOf(study);
          const subs = drive.files.find((f) => f.parent === root.id && f.name === "GT submissions") || drive.folder({ name: "GT submissions", parent: root.id });
          drive.writableBy(subs, email);
        },
        manages: (folder) => drive.writableBy(folder, email),
        // the page's own record of this user signed in, a token for left ms
        signedIn: ({ left = 3599e3 } = {}) => google.signedIn({ email, name, scopes: granted, until: Date.now() + left }),
      };
    },
    // signedIn: a user, the device holding their sign-in, a token for left ms; welcome: the opening popup's answer
    // kept, google when signed in and anonymous otherwise, or null for none; role: the role kept; keys: other browser
    // keys kept; drafts: ground-truth drafts kept (device_storage.mjs's records); serviceWorker: the site's worker
    // left to run; every other option the context's own
    async device({ signedIn = null, left, welcome = signedIn ? "google" : "anonymous", role, keys = {}, drafts = [], serviceWorker = false, ...options } = {}) {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...options });
      const kept = { ...keys };
      if (signedIn) kept["nor-google-sign-in"] = JSON.stringify(signedIn.signedIn({ left }));
      if (welcome) kept["nor-welcome"] = JSON.stringify({ choice: welcome, remember: true });
      if (role) kept["nor-role"] = role;
      // what the device holds from before, written once a tab before any script of the page's runs, so a page that
      // changes it keeps its change
      await ctx.addInitScript(([kept, drafts, serviceWorker]) => {
        if (!serviceWorker) delete Navigator.prototype.serviceWorker;
        if (window !== window.top || sessionStorage.getItem("world-kept")) return;
        sessionStorage.setItem("world-kept", "1");
        for (const [k, v] of Object.entries(kept)) localStorage.setItem(k, v);
        if (!drafts.length) return;
        const q = indexedDB.open("gt-drafts", 1);
        q.onupgradeneeded = () => q.result.createObjectStore("drafts", { keyPath: ["study", "sha256"] });
        q.onsuccess = () => {
          const t = q.result.transaction("drafts", "readwrite");
          for (const r of drafts) t.objectStore("drafts").put(r);
          t.oncomplete = t.onabort = () => q.result.close();
        };
      }, [kept, drafts, serviceWorker]);
      return {
        ctx,
        async open(url, { until = "ready" } = {}) {
          const page = await ctx.newPage();
          page.setDefaultTimeout(STEP);
          await page.goto(url);
          await UNTIL[until](page);
          return page;
        },
        close: () => ctx.close(),
      };
    },
  };
  return w;
}
