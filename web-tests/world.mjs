// The world a page test sets up, said in the test's own terms: who the users are and what Google lets them do, what
// their Drive holds and how it answers, how the site is deployed and its studies are set, and the devices they open
// the page on, each holding what it kept before. One world for a browser's every context, as the fakes are
// (fakes/index.mjs); a device is a context of its own. Each call returns its own subject, so a set-up reads as one
// sentence; what is left unsaid is the common case.
//   const w = world(browser, origin);
//   w.site.withGoogle();                                  the deploy's variables (fakes/site_settings.mjs)
//   w.studies.atStage("nor", "Analyze");                  the studies as served (fakes/studies.mjs)
//   const ada = w.user("ada@acme.example").named("Ada").without(DRIVE_FILE).savedSettings({ "nor-theme": "dark" }).annotates("nor");
//   w.studyFolder("nor").readableBy(ada)                  a study's members, Drive's readers of its root
//   w.folder("Root C").public().saysStudy({ stage: "Public" })   a root's study file, as Study Setup left it; .study() reads it back
//   const cache = w.folder("Cache").public();             a Drive folder, its sharing said as a test means it
//   const a = cache.holds(image.png("a.png"));            what it holds (images.mjs), a.id its Drive id
//   w.studyFolder("nor").holds(image.tiff("s.tif", {...}))  a study's own folder, as its study.json names it
//   w.file(image.png("b.png"))                            a file at Drive's top, in no folder
//   const page = await w.device().signedInAs(ada).keeps({ "nor-motion": "false" }).opens("nor");
//   w.device().kept()                                     a browser profile of its own, for what Playwright's WebKit
//     empties from a throwaway context (harness.mjs's keptContext)
// A device, unless told: no one signed in, the opening popup answered (google signed in, else anonymous), the site's
// worker gone, 1400x900, and a page that waits until the study says Ready. opens() alone is the site's own address.
import { driveIn } from "./fakes/google_drive.mjs";
import { SCOPES, signInIn } from "./fakes/google_sign_in.mjs";
import { settingsIn } from "./fakes/site_settings.mjs";
import { studies as studiesOf, studiesIn } from "./fakes/studies.mjs";
import { pw, keptContext, worldOf } from "./harness.mjs";
import { STEP } from "./deadlines.mjs";

export const DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
const STUDY_FILE = "rauntruth-study.json";
// what a page waits on before a test goes on: the study's Python ready, the page's title drawn, or nothing
const UNTIL = {
  ready: (page) => page.waitForFunction(() => document.querySelector("#status")?.textContent.startsWith("Ready")),
  title: (page) => page.waitForFunction(() => document.querySelector("#title")?.textContent),
  none: async () => {},
};

// Drive's folders, said as a test means them, on a Drive fake: a browser's world's, or one under Node with no browser
// (fakes/google_drive_under_node.mjs)
export function foldersOn(drive) {
  // a folder on Drive, said as a test means it; record: the fake's own
  const folderOf = (record) => {
    const f = {
      id: record.id, name: record.name, record,
      // anyone with the link reads it, by the site's key too; sharedWithUserAlone: the signed-in user's token alone
      public() { record.access = "public"; return f; },
      // Drive's sharing lets these users read it, and what it holds, and no one by the link: its members
      readableBy(...users) { record.access = "private"; drive.readers.set(record.id, new Set([...(drive.readers.get(record.id) ?? []), ...users.map((u) => u.email ?? u)])); return f; },
      sharedWithUserAlone() { drive.sharedWithUserAlone(record); return f; },
      viewableOnly() { drive.viewableOnly(record); return f; },
      writableBy(...users) { drive.writableBy(record, ...users.map((u) => u.email ?? u)); return f; },
      writableByAnyone() { drive.writableByAnyone(record); return f; },
      // these users alone may add to it, whoever could before
      writableOnlyBy(...users) { drive.writers.set(record.id, new Set(users.map((u) => u.email ?? u))); return f; },
      // its owner stops sharing it with these users: they neither read it nor add to it any more
      unsharedWith(...users) {
        for (const e of users.map((u) => u.email ?? u)) { drive.readers.get(record.id)?.delete(e); drive.writers.get(record.id)?.delete?.(e); }
        return f;
      },
      folder: (name, options = {}) => on.folder(name, { ...options, in: record }),
      // the study file a study's root holds as Study Setup left it (req/shell/ground-truth/setup), with these keys over
      // what it said before; id: Drive's, when the test names it
      saysStudy(keys = {}, { id } = {}) {
        const had = f.studyFile();
        if (had) had.bytes = Buffer.from(JSON.stringify({ ...f.study(), ...keys }));
        else f.holds({ name: STUDY_FILE, bytes: Buffer.from(JSON.stringify({ format: "rauntruth-study/2", ...keys })) }, { id, bySite: true });
        return f;
      },
      // the study file's record in the fake, or null; and what it says now, as the page left it
      studyFile: () => drive.files.find((g) => g.parent === record.id && g.name === STUDY_FILE) ?? null,
      study: () => { const g = f.studyFile(); return g && JSON.parse(g.bytes.toString()); },
      // an image or file (images.mjs) in it; id, createdTime: Drive's, when the test names them; alsoIn: other
      // folders it is in too, as Drive lets a file sit in several; bySite: one the site made, which it may replace;
      // the fake's record
      holds({ name, mimeType, bytes }, { id, createdTime, alsoIn = [], bySite = false } = {}) {
        return drive.file({ name, mimeType, bytes, parent: record.id, mine: bySite, ...(id ? { id } : {}), ...(createdTime ? { createdTime } : {}),
          ...(alsoIn.length ? { also: alsoIn.map((g) => g.id ?? g) } : {}) });
      },
    };
    return f;
  };
  const on = {
    // a Drive folder, in another (a folder handle or an id) or at the top; id: its Drive id, when the test names it
    folder(name, { in: parent, id } = {}) { return folderOf(drive.folder({ name, parent: parent?.id ?? parent ?? null, ...(id ? { id } : {}) })); },
    studyFolder: (study) => folderOf(drive.rootOf(study)),
    // a file someone removes from Drive, or renames, elsewhere than on the page
    removeFile(file) { drive.files.splice(drive.files.indexOf(file), 1); },
    renameFile(file, name) { file.name = name; file.modified = drive.tick(); },
    // a folder the fake already holds, by its record or id, said as a test means it
    of: (folder) => folderOf(folder.id ? folder : drive.get(folder)),
    // an image or file at Drive's top, in no folder, as a folder holds one
    file: (image, options) => folderOf({ id: null }).holds(image, options),
  };
  return on;
}

export function world(browser, origin) {
  const shared = worldOf(browser), drive = driveIn(shared), google = signInIn(shared), folders = foldersOn(drive);
  const w = {
    browser, drive, google, site: settingsIn(shared), studies: studiesIn(shared),

    folder: folders.folder, studyFolder: folders.studyFolder, file: folders.file, of: folders.of,
    removeFile: folders.removeFile, renameFile: folders.renameFile,

    // a Google account, the one Google's window signs in next
    user(email) {
      let name = email, picture = null, withheld = [];
      google.answersAs({ email, name });
      const user = {
        email,
        get name() { return name; },
        get scopes() { return SCOPES.split(" ").filter((s) => !withheld.includes(s)).join(" "); },
        named(n) { name = n; google.answersAs({ email, name, picture }); return user; },
        // the picture Google's account details give, at that address
        pictured(url) { picture = url; google.answersAs({ email, name, picture }); return user; },
        // a scope Google leaves out of their token, its box unticked
        without(...scopes) { withheld = scopes; google.withhold = scopes; return user; },
        // the settings file another device of theirs left on Drive
        savedSettings(record) { google.savedSettings(email, record); return user; },
        // Drive's sharing lets them add to the study's Extractions folder, which lets them save its ground truth
        // (req/shell/data/roles); with no study named, every study's
        annotates(...studies) {
          for (const study of studies.length ? studies : drive.studies) {
            const root = drive.rootOf(study);
            const subs = drive.files.find((f) => f.parent === root.id && f.name === "Extractions") || drive.folder({ name: "Extractions", parent: root.id });
            drive.writableBy(subs, email);
          }
          return user;
        },
        // Drive's sharing lets them add to the folder, which makes them its study's manager
        manages(folder) { drive.writableBy(folder.record ?? folder, email); return user; },
        // Drive's sharing lets them read the folder, which makes them a member of the study it is the root of
        // (req/shell/study/members)
        memberOf(folder) { (folder.readableBy ? folder : foldersOn(drive).of(folder)).readableBy(email); return user; },
      };
      return user;
    },

    device() {
      const kept = {}, options = { viewport: { width: 1400, height: 900 } };
      const cached = [], served = [];
      let who = null, left = 3599e3, granted, welcome, drafts = [], worker = false, profile = false, given = null, held, waiting, remember = true, ctx = null;
      const device = {
        // signed in on the device, Google's token lasting left ms; token: its value, for a test that checks what
        // carried it, else one of the sign-in fake's; unsaved: the settings' keys changed here since Drive last had
        // them; scopes: what the token kept may do, in place of what the user's would, as one granted before the page
        // asked for more
        signedInAs(user, { tokenLeft = left, token, unsaved, scopes } = {}) { who = user; left = tokenLeft; held = token; waiting = unsaved; granted = scopes; return device; },
        // the opening popup's answer kept ("google", "anonymous"), or null for none yet; remembered: whether its
        // Remember this choice was ticked
        welcomed(answer, { remembered = true } = {}) { welcome = answer; remember = remembered; return device; },
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
        // study id's study.json as this device alone is served it, with these keys (its stage, say)
        withStudy(id, keys) { served.push([id, keys]); return device; },
        // a browser context made elsewhere, which then holds what the device keeps
        on(context) { given = context; return device; },
        // the browser context's own options (a viewport, a user agent, a clock)
        with(more) { Object.assign(options, more); return device; },
        // the device's browser context, made on first need with all it holds
        async context() {
          if (ctx) return ctx;
          ctx = given || (profile ? await keptContext(pw, options, shared) : await browser.newContext(options));
          for (const [id, keys] of served) studiesOf(ctx).edit(id, (m) => ({ ...m, ...keys }));
          const seed = { ...kept };
          if (who) {
            const record = google.signedIn({ email: who.email, name: who.name, scopes: granted ?? who.scopes, token: held, until: Date.now() + left });
            seed["nor-google-sign-in"] = JSON.stringify(waiting ? { ...record, changed: waiting } : record);
          }
          const answer = welcome === undefined ? (who ? "google" : "anonymous") : welcome;
          if (answer) seed["nor-welcome"] = JSON.stringify({ choice: answer, remember });
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
        opens: (study, { until = "ready" } = {}) => device.visits(`/web/${study ?? ""}`, { until }),
        // the study's Study Setup page (req/setup/page), until as opens()
        opensSetup: (study, { until = "ready" } = {}) => device.visits(`/web/setup?study=${study}`, { until }),
        // a page on an address of the site's as a visitor has it (an old one, one with a query), until as opens()
        async visits(address, { until = "ready" } = {}) {
          const c = await device.context(), page = c.pages().find((p) => p.url() === "about:blank") || await c.newPage();
          page.setDefaultTimeout(STEP);
          await page.goto(origin + address);
          await UNTIL[until](page);
          return page;
        },
        // the hour up for the device, on a page of the site's it has open: Google refuses every token so far, and the
        // page's record of the sign-in says it ran out
        async tokenRunsOut(page) {
          google.revokeAll();
          await page.evaluate(() => {
            const s = JSON.parse(localStorage.getItem("nor-google-sign-in"));
            s.until = Date.now() - 1;
            localStorage.setItem("nor-google-sign-in", JSON.stringify(s));
          });
        },
        close: () => ctx?.close(),
      };
      return device;
    },
  };
  return w;
}
