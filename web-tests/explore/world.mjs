// A world the explorer walks (explore.mjs): a world file of worlds/ (data: the study and its stage, the Drive tree
// and who Drive's sharing lets read and write it, who is signed in and as what, the window, the world events' weights)
// made real on the stand-in Google of stand_in_drive.mjs, its page open; and the world events, what happens to the
// person beyond the page: the network going and coming, the token running out, Drive changed elsewhere.
//   const w = await boot(world, prepared, { plants, pageError });
//   w.page, w.ctx, w.drive, w.google, w.events[name].run(arg), w.close()
// plants: faults planted on purpose, for the explorer's own test: "throw:<selector>", a control that throws when
// clicked; "write:<n>", the page writing a file to the study's folder on its own at the person's nth click.
import fs from "node:fs";
import { standIn } from "../stand_in_drive.mjs";

const PLANT = ([plants, root]) => {
  for (const p of plants) {
    const [kind, arg] = [p.slice(0, p.indexOf(":")), p.slice(p.indexOf(":") + 1)];
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

export async function boot(world, prepared, { plants = [], pageError, scale = 1 } = {}) {
  const d = world.drive;
  const s = await standIn({ answers: prepared.answers, studies: prepared.studies, rootDir: prepared.rootDir, gt: d.gt !== false,
    members: d.access === "private" ? d.members || [] : undefined, pageError });
  const { drive, google } = s;
  s.writers.clear();
  for (const w of d.writers || []) s.writers.add(w);
  if (d.gt !== false) {
    if (d.submissionsWriters) drive.writers.set(s.GT.submissions, new Set(d.submissionsWriters));
    if (d.curatedWriters) drive.writers.set(s.GT.curated, new Set(d.curatedWriters));
  }
  const account = world.user || world.signIn?.account;
  if (account) google.account = { sub: "2001", name: account.name, email: account.email, picture: null };
  google.answer = world.signIn?.answer || "grant";
  const seed = { ...(world.role ? { "nor-role": world.role } : {}), ...(world.seed || {}) };
  const page = await s.open(!!world.user, {
    id: world.study, email: world.user?.email, name: world.user?.name, seed, scale, welcome: !!world.welcome,
    study: { ...(world.stage ? { stage: world.stage } : {}), ...(world.studyJson || {}) },
    ...(world.viewport ? { viewport: world.viewport } : {}),
    ...(world.token?.expired ? { until: Date.now() - 60e3 } : {}),
    prepare: plants.length ? (ctx) => ctx.addInitScript(PLANT, [plants, s.ROOT]) : undefined,
  });
  const ctx = page.context();
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
    reload: { when: (v) => v.online !== false, run: () => page.reload() },
    // back to the page before, never past the first one the walk opened, the browser's blank one
    back: { when: (v) => v.online !== false, run: async () => {
      await page.goBack();
      if (!page.url().startsWith(s.origin)) { await page.goForward(); return "no page before"; }
    } },
    // the app opened again, where a step left it for a page that is not the app: the walk's own, never drawn at random
    returnToApp: { when: () => false, run: () => page.goto(s.origin + "/web/" + world.study) },
    // Google ends the token before the page's own record of it says
    expireToken: { when: () => google.tokens.size > 0, run: () => { for (const t of google.tokens.values()) t.until = Date.now() - 1; } },
    signedOutElsewhere: { when: () => google.tokens.size > 0, run: () => google.revokeAll() },
    // what Google's window answers the next time the page asks it
    googleAnswers: { when: () => true, run: (n) => { google.answer = ["grant", "deny", "closed", "blocked"][n % 4]; return google.answer; } },
    driveAdded: { when: () => folders().length > 0, run: (n) => {
      const f = folders()[n % folders().length];
      drive.file({ name: `scan ${++made} added elsewhere.png`, parent: f.id, bytes: png });
      return f.name;
    } },
    driveRemoved: { when: () => theirs().length > 0, run: (n) => {
      const f = theirs()[n % theirs().length];
      drive.files.splice(drive.files.indexOf(f), 1);
      return f.name;
    } },
    driveRenamed: { when: () => theirs().length > 0, run: (n) => {
      const f = theirs()[n % theirs().length], was = f.name;
      f.name = "renamed " + f.name; f.modified = drive.tick();
      return was;
    } },
    // the owner stops sharing the study's folder with this person
    accessRemoved: { when: () => !!world.user && (drive.readers.get(s.ROOT)?.has(world.user.email) || s.writers.has(world.user.email)), run: () => {
      drive.readers.get(s.ROOT)?.delete(world.user.email);
      s.writers.delete(world.user.email);
    } },
    switchStudy: { when: (v) => v.online !== false, run: (n) => {
      const to = world.switchTo || ["viewer", "nor", world.study];
      return page.goto(s.origin + "/web/" + to[n % to.length]).then(() => to[n % to.length]);
    } },
  };
  return { page, ctx, drive, google, events, origin: s.origin, ROOT: s.ROOT, close: s.close };
}
