// A world the explorer walks (explore.mjs): a world file of worlds/ (data: the study and its stage, the Drive tree
// and who Drive's sharing lets read and write it, who is signed in and as what, the window, the world events' weights,
// and allow: patterns of what the page says by design in this world, as a stranger refused the study's folder)
// made real on the stand-in Google of stand_in_drive.mjs, its page open; and the world events, what happens to the
// person beyond the page: the network going and coming, the token running out, Drive changed elsewhere.
// world.page: "setup" opens the study's Study Setup page, in place of the study's own.
//   const w = await boot(world, prepared, { plants, pageError });
//   w.page, w.ctx, w.drive, w.google, w.events[name].run(arg), w.close()
// plants: faults planted on purpose, for the explorer's own test: "throw:<selector>", a control that throws when
// clicked; "write:<n>", the page writing a file to the study's folder on its own at the person's nth click;
// "style:<css>", a stylesheet of the test's own added to the page. motions: the page's motions recorded (page_motions.mjs, and those its script starts).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { standIn } from "../stand_in_drive.mjs";
import { cdnFile } from "../fakes/cdn.mjs";
import { record } from "../page_motions.mjs";

const STUDIES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "studies");
// each file a study names to keep offline (web.offline of its study.json), which jsDelivr serves and the fake holds no
// copy of: answered with an empty file of its kind, as the page keeping it offline reads nothing of it
const offlineFiles = () => fs.readdirSync(STUDIES).flatMap((id) => {
  try { return JSON.parse(fs.readFileSync(path.join(STUDIES, id, "study.json"), "utf8")).web?.offline || []; } catch { return []; }
});

const PLANT = ([plants, root]) => {
  for (const p of plants) {
    const [kind, arg] = [p.slice(0, p.indexOf(":")), p.slice(p.indexOf(":") + 1)];
    if (kind === "style") addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: arg })));
    if (kind === "throw") document.addEventListener("click", (e) => { if (e.target.closest?.(arg)) throw new Error("planted fault: " + arg + " throws"); }, true);
    if (kind === "write") {
      let clicks = 0;
      document.addEventListener("click", (e) => {
        if (!e.isTrusted || ++clicks !== Number(arg)) return;
        const token = JSON.parse(localStorage.getItem("nor-google-sign-in") || "null")?.token, b = "planted";
        const body = `--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: "planted.txt", parents: [root] })}\r\n--${b}\r\nContent-Type: text/plain\r\n\r\nplanted\r\n--${b}--`;
        fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", { method: "POST", body,
          headers: { authorization: "Bearer " + token, "content-type": `multipart/related; boundary=${b}` } });
      }, true);
    }
  }
};

// the animations the page's own script starts, which no CSS event tells of: what each moves, in window.scriptedMotions
const SCRIPTED = () => {
  window.scriptedMotions = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, ...rest) {
    const moved = [...new Set([].concat(frames || []).flatMap((f) => Object.keys(f)))].filter((k) => !["offset", "easing", "composite"].includes(k));
    window.scriptedMotions.push(moved.join("+") || "animation");
    return animate.call(this, frames, ...rest);
  };
};

export async function boot(world, prepared, { plants = [], pageError, scale = 1, motions = false } = {}) {
  const d = world.drive;
  const s = await standIn({ answers: prepared.answers, studies: prepared.studies, rootDir: prepared.rootDir, gt: d.gt !== false,
    members: d.access === "private" ? d.members || [] : undefined, pageError });
  const { drive, google, w, root } = s;
  root.writableOnlyBy(...(d.writers || []));
  // what the walk's person saves is saved now, so that the page's "saved today" is the persona's today
  drive.clockAt(Date.now());
  if (d.gt !== false && d.extractionsWriters) w.of(s.GT.extractions).writableOnlyBy(...d.extractionsWriters);
  // the study's settings file, as the page makes it when the study is set up: the site's own, which it may replace
  for (const f of drive.files) if (/^rauntruth-/.test(f.name)) f.mine = true;
  const account = world.user || world.signIn?.account;
  if (account) w.user(account.email).named(account.name);
  google.answer = world.signIn?.answer || "grant";
  const seed = { ...(world.seed || {}) };
  const page = await s.open(!!world.user, {
    id: world.study, setup: world.page === "setup", email: world.user?.email, name: world.user?.name, seed, scale, welcome: !!world.welcome,
    study: { ...(world.stage ? { stage: world.stage } : {}), ...(world.studyJson || {}) },
    ...(world.viewport ? { viewport: world.viewport } : {}),
    ...(world.token?.expired ? { until: Date.now() - 60e3 } : {}),
    prepare: plants.length || motions ? async (ctx) => { if (motions) { await record(ctx); await ctx.addInitScript(SCRIPTED); } if (plants.length) await ctx.addInitScript(PLANT, [plants, s.ROOT]); } : undefined,
  });
  const ctx = page.context();
  for (const u of offlineFiles()) cdnFile(ctx, u, /\.m?js$/.test(u) ? "export {};" : "", /\.m?js$/.test(u) ? "text/javascript" : "application/octet-stream");
  const png = fs.readFileSync(prepared.files.png);
  // the files a person could have in the study's folder tree, the page's own made ones and the settings file left out
  const under = (id) => { for (let f = drive.get(id); f; f = drive.get(f.parent)) if (f.id === s.ROOT) return true; return false; };
  const theirs = () => drive.files.filter((f) => !f.folder && under(f.id) && !/^rauntruth-/.test(f.name) && f.parent && drive.get(f.parent)?.name !== "Previews");
  const folders = () => drive.files.filter((f) => f.folder && (f.id === s.ROOT || under(f.id)) && f.name !== "Previews");
  let made = 0;
  // each event: when it can happen, and what it does, given a number drawn for it
  const events = {
    offline: { when: (v) => v.online !== false, run: () => ctx.setOffline(true) },
    online: { when: (v) => v.online === false, run: () => ctx.setOffline(false) },
    // a page opened while offline is the service worker's to answer, which the stand-in Google turns off: the walk
    // goes to another page online alone
    reload: { when: (v) => v.online !== false, run: () => page.reload() }, // visits again on purpose (a reload is the subject): a person reloading is one of the walk's steps
    // back to the page before, never past the first one the walk opened, the browser's blank one
    back: { when: (v) => v.online !== false, run: async () => {
      await page.goBack();
      if (!page.url().startsWith(s.origin)) { await page.goForward(); return "no page before"; }
    } },
    // the app opened again, where a step left it for a page that is not the app: the walk's own, never drawn at random
    returnToApp: { when: () => false, run: () => page.goto(s.origin + (world.page === "setup" ? "/web/setup?study=" : "/web/") + world.study) },
    // Google ends the token before the page's own record of it says
    expireToken: { when: () => google.tokens.size > 0, run: () => { for (const t of google.tokens.values()) t.until = Date.now() - 1; } },
    signedOutElsewhere: { when: () => google.tokens.size > 0, run: () => google.revokeAll() },
    // what Google's window answers the next time the page asks it
    googleAnswers: { when: () => true, run: (n) => { google.answer = ["grant", "deny", "closed", "blocked"][n % 4]; return google.answer; } },
    driveAdded: { when: () => folders().length > 0, run: (n) => {
      const f = folders()[n % folders().length];
      w.of(f).holds({ name: `scan ${++made} added elsewhere.png`, bytes: png });
      return f.name;
    } },
    driveRemoved: { when: () => theirs().length > 0, run: (n) => {
      const f = theirs()[n % theirs().length];
      w.removeFile(f);
      return f.name;
    } },
    driveRenamed: { when: () => theirs().length > 0, run: (n) => {
      const f = theirs()[n % theirs().length], was = f.name;
      w.renameFile(f, "renamed " + f.name);
      return was;
    } },
    // the owner stops sharing the study's folder with this person
    accessRemoved: { when: () => !!world.user && (drive.readers.get(s.ROOT)?.has(world.user.email) || !!drive.writers.get(s.ROOT)?.has(world.user.email)),
      run: () => { root.unsharedWith(world.user.email); } },
    switchStudy: { when: (v) => v.online !== false, run: (n) => {
      const to = world.switchTo || ["viewer", "nor", world.study];
      return page.goto(s.origin + (world.page === "setup" ? "/web/setup?study=" : "/web/") + to[n % to.length]).then(() => to[n % to.length]);
    } },
  };
  return { page, ctx, drive, google, events, origin: s.origin, ROOT: s.ROOT, close: s.close };
}
