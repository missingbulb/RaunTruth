// Drives the page (web/) in headless Chromium against the fakes of Google's sign-in script and account details,
// and checks req/shell/account/welcome: where the site has a Google client, opening the page fades it behind a popup offering Sign in
// with Google or Continue anonymously, with Remember this choice unticked; unticked, the popup comes back on the
// next visit, signed in or not, and there Continue anonymously signs out; ticked, signed in opens signed in with no
// popup, and anonymously opens with no popup but a tip beside the avatar, until closed; signing out from the menu
// brings the popup back; Escape changes nothing; Google's script loads only once the user reaches for its button;
// offline, Sign in with Google is held and a line says it can wait for the network; with no Google client there is
// no popup. And req/shell/account/consent-guide: signing in with no one signed in here first opens the guide to Google's
// screens, which asks Google only in its own button's click, asks nothing on Cancel, and closes once Google answers.
// Optional SHOTS: a directory for screenshots.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/welcome_driver.mjs [SHOTS]
import { fileURLToPath } from "node:url";
import path from "node:path";

import { cutShort } from "./page_errors.mjs";
import { pw, launch, expecting, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { orMissed } from "./page_until.mjs";
import { world } from "./world.mjs";

const [shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GSI = "https://accounts.google.com/gsi/client";
const { origin, server } = await serveSite({ "/web/worker.js": "" });

const browser = await launch(pw), w = world(browser, origin);
w.site.withGoogle();
// the sign-in fake: what Google's window answers, and how often the page loaded Google's script
const google = w.google;
const ada = w.user("ada@acme.example").named("Ada Lovelace");
// whether the page asked for Google's script: it appends the script's element in the handler that wants it, so the
// element is there once the action that would load it returns, before any request reaches the route
const askedGoogle = (page) => page.evaluate((src) => !!document.querySelector(`script[src="${src}"]`), GSI);

// a visit on a device, one never welcomed unless it says; offline, the browser says so; open(): visiting again
async function device({ offline = false, on = w.device().welcomed(null) } = {}) {
  const ctx = await on.context();
  if (offline) await ctx.addInitScript(() => { window.netDown = sessionStorage.getItem("net") !== "up"; Object.defineProperty(Navigator.prototype, "onLine", { get: () => !window.netDown }); });
  // the device opens the site on this tab, heard from the start
  (await ctx.newPage()).on("pageerror", (e) => { if (!cutShort(e)) check(false, "page error: " + e.message); });
  // the popup and the tip are decided as the shell's module runs, before the study's title is shown
  const page = await on.opens(undefined, { until: "title" });
  const open = () => on.visits("/web/index.html", { in: page, until: "title" });
  return { ctx, page, open, on };
}
const popup = (page) => page.evaluate(() => { const d = document.querySelector("#welcome-dlg"); return !!d && d.open && d.matches(":modal"); });
const signedIn = (page) => page.evaluate(() => !document.querySelector("#sign-out").hidden);
const signInTip = (page) => page.evaluate(() => {
  const t = document.querySelector('.tip-bubble[data-tip="sign-in"]'), a = document.querySelector("#user-menu summary");
  if (!t) return null;
  const r = t.getBoundingClientRect(), ar = a.getBoundingClientRect();
  const s = document.createElement("style"); s.textContent = ".tip-bubble::before { pointer-events: auto !important; }"; document.head.append(s);
  const arrow = t.contains(document.elementFromPoint((ar.left + ar.right) / 2, ar.bottom + 5)); s.remove();
  return { text: t.textContent, inside: r.left >= 0 && r.right <= innerWidth, below: r.top >= ar.bottom && r.top - ar.bottom < 30, under: r.left < ar.right && r.right > ar.left, arrow };
});
// Google's guide (req/shell/account/consent-guide), while it is open: its words, whether each screenshot drew, and
// how often Google was asked so far
const guide = (page) => page.evaluate(() => {
  const d = document.querySelector("#guide-dlg");
  return d?.open ? { text: d.textContent, drawn: [...d.querySelectorAll("img")].map((i) => i.complete && i.naturalWidth > 0), asked: window.tokenClient?.asked?.length || 0 } : null;
});
// a sign-in that opens the guide: on through its Open Google's window
const throughGuide = async (page) => { await orMissed(page.waitForSelector("#guide-dlg[open]", { timeout: 3000 })); if (await guide(page)) await page.click("#guide-go"); };
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name + ".png") }); };

try {
  // a first visit
  const a = await device();
  await a.page.hover("#welcome-sign-in");
  await a.page.focus("#welcome-sign-in");
  check(google.scriptLoads === 0 && !(await askedGoogle(a.page)), "the mouse passing over Sign in with Google, or focus reaching it, loads nothing from Google");
  check(await popup(a.page), "opening the page fades it behind the sign-in popup");
  check(await a.page.evaluate(() => {
    const d = document.querySelector("#welcome-dlg");
    return /Sign in with Google/.test(d.querySelector("#welcome-sign-in").textContent) && /anonymous/i.test(d.querySelector("#welcome-anonymous").textContent)
      && !d.querySelector("#welcome-remember").checked && getComputedStyle(d, "::backdrop").backgroundColor !== "rgba(0, 0, 0, 0)";
  }), "it offers Sign in with Google and Continue anonymously, Remember this choice unticked, over a faded page");
  check(google.scriptLoads === 0, "the popup loads nothing from Google by itself");
  await shot(a.page, "welcome");

  // Escape changes nothing
  await a.page.keyboard.press("Escape");
  check(!(await popup(a.page)), "Escape closes it");
  await a.open();
  check(await popup(a.page), "and it comes back on the next visit");

  // anonymously, not remembered
  await a.page.click("#welcome-anonymous");
  check(!(await popup(a.page)) && !(await signedIn(a.page)) && google.scriptLoads === 0, "Continue anonymously closes it, signed out, loading nothing from Google");
  check(!(await signInTip(a.page)), "and shows no tip while the choice is not remembered");
  // req/shell/dialogs/focus-kept: nothing on the page opened it, so the keyboard goes to the page's first control
  // at once, not once the popup's closing motion has ended
  check(await orMissed(a.page.waitForFunction(() => { const f = document.activeElement; return f && f !== document.body && !f.closest("dialog"); }, null, { timeout: 300 })),
    "and the keyboard stays on the page, not its body");
  await a.open();
  check(await popup(a.page), "unticked, the popup comes back on the next visit");

  // anonymously, remembered
  await a.page.check("#welcome-remember");
  await a.page.click("#welcome-anonymous");
  await a.open();
  check(!(await popup(a.page)), "ticked, the next visit opens with no popup");
  const t = await signInTip(a.page);
  check(t && /sign in/i.test(t.text) && /settings/i.test(t.text) && /data files/i.test(t.text), "a tip suggests signing in to keep the settings everywhere and reach the data files: " + t?.text);
  check(t && t.inside && t.below && t.under && t.arrow, "beside the avatar, inside the window, its arrow at the avatar: " + JSON.stringify(t));
  check(google.scriptLoads === 0, "an anonymous visit loads nothing from Google");
  await shot(a.page, "welcome_tip");
  await a.page.click('.tip-bubble[data-tip="sign-in"] .x');
  await a.open();
  check(!(await popup(a.page)) && !(await signInTip(a.page)), "the tip, once closed, does not come back");

  // signed in, not remembered
  const b = await device();
  await b.page.hover("#welcome-sign-in");
  await b.page.mouse.down();
  check(await orMissed(b.page.waitForFunction(() => window.google)), "pressing Sign in with Google loads Google's script");
  await b.page.mouse.up();
  const g1 = await b.page.waitForSelector("#guide-dlg[open]", { timeout: 3000 })
    .then(() => orMissed(b.page.waitForFunction(() => [...document.querySelectorAll("#guide-dlg img")].every((i) => i.complete), null, { timeout: 5000 })))
    .then(() => guide(b.page), () => null);
  check(!!g1 && g1.asked === 0 && !(await signedIn(b.page)), "no one signed in here, Sign in with Google first opens the guide to Google's screens, asking Google nothing yet");
  check(!!g1 && /Advanced/.test(g1.text) && /unsafe/.test(g1.text) && /Continue/.test(g1.text) && g1.drawn.length >= 3 && g1.drawn.every(Boolean),
    "it shows the unverified-app screen's Advanced and Go to (unsafe), the boxes to tick and Continue, each in a screenshot: " + JSON.stringify(g1 && { drawn: g1.drawn }));
  if (shots) await b.page.waitForFunction(() => !document.querySelector("#guide-dlg").getAnimations({ subtree: true }).some((a) => a.playState === "running"));
  await shot(b.page, "consent_guide");
  await b.page.click("#guide-cancel");
  check(!(await guide(b.page)) && await b.page.evaluate(() => !window.tokenClient?.asked?.length) && await popup(b.page) && !(await signedIn(b.page)), "the guide's Cancel asks Google nothing and leaves the popup up");
  await b.page.click("#welcome-sign-in");
  await b.page.waitForSelector("#guide-dlg[open]");
  await b.page.click("#guide-go");
  check(await b.page.evaluate(() => window.tokenClient?.asked?.length === 1), "its Open Google's window asks Google in that click");
  check(await orMissed(b.page.waitForFunction(() => !document.querySelector("#sign-out").hidden)) && !(await popup(b.page)),
    "Sign in with Google signs the user in and closes the popup");
  await b.open();
  check(await popup(b.page) && await signedIn(b.page), "unticked, the next visit, still signed in, shows the popup again");
  check(/Ada Lovelace/.test(await b.page.textContent("#welcome-dlg")), "naming who is signed in");
  await b.page.click("#welcome-sign-in");
  check(await orMissed(b.page.waitForFunction(() => !document.querySelector("#welcome-dlg").open)) && !(await guide(b.page)) && await signedIn(b.page),
    "signed in already, Sign in with Google goes on as the user with no guide");
  await b.open();
  await b.page.click("#welcome-anonymous");
  check(!(await signedIn(b.page)) && await b.page.evaluate(() => localStorage.getItem("nor-google-sign-in")) === null, "there Continue anonymously signs out");

  // signed in, remembered
  await b.open();
  await b.page.check("#welcome-remember");
  await b.page.click("#welcome-sign-in");
  await throughGuide(b.page);
  await b.page.waitForFunction(() => !document.querySelector("#sign-out").hidden);
  await b.open();
  check(!(await popup(b.page)) && await signedIn(b.page), "ticked, the next visit opens signed in with no popup");
  check(!(await signInTip(b.page)), "and no sign-in tip");
  await b.page.click("#user-menu summary");
  await b.page.click("#sign-out");
  await b.open();
  check(await popup(b.page), "signing out from the menu brings the popup back");

  // signing in from the menu counts as remembered
  await b.page.keyboard.press("Escape");
  await b.page.click("#user-menu summary");
  await b.page.waitForFunction(() => window.tokenClient);
  await b.page.click("#sign-in");
  check(await orMissed(b.page.waitForSelector("#guide-dlg[open]", { timeout: 3000 })), "the menu's Sign in with Google opens the guide too");
  await b.page.click("#guide-go");
  await b.page.waitForFunction(() => !document.querySelector("#sign-out").hidden);
  await b.open();
  check(!(await popup(b.page)) && await signedIn(b.page), "signing in from the menu counts as remembered");

  // offline
  const loads = google.scriptLoads;
  const c = await device({ offline: true });
  check(await popup(c.page), "offline, the popup still comes");
  const off = await c.page.evaluate(() => ({ held: document.querySelector("#welcome-sign-in").getAttribute("aria-disabled") === "true", note: document.querySelector("#welcome-offline"), }));
  check(off.held, "Sign in with Google is held");
  check(await c.page.isVisible("#welcome-offline") && /online/i.test(await c.page.textContent("#welcome-offline")), "and a line says signing in can wait until the network is back");
  await shot(c.page, "welcome_offline");
  await c.page.hover("#welcome-sign-in");
  await c.page.click("#welcome-sign-in", { force: true });
  check(google.scriptLoads === loads && !(await askedGoogle(c.page)) && await popup(c.page), "clicking it offline reaches nothing and leaves the popup up");
  await c.page.evaluate(() => { window.netDown = false; dispatchEvent(new Event("online")); });
  check(await c.page.isHidden("#welcome-offline") && await c.page.evaluate(() => document.querySelector("#welcome-sign-in").getAttribute("aria-disabled") !== "true"),
    "back online, Sign in with Google is offered again");
  await c.page.evaluate(() => { window.netDown = true; dispatchEvent(new Event("offline")); });
  await c.page.click("#welcome-anonymous");
  check(!(await popup(c.page)), "and offline, Continue anonymously works");

  // signed in, not remembered, opened offline: no popup, still signed in, the changes waiting for Drive kept
  const e = await device({ offline: true, on: w.device().signedInAs(ada, { tokenLeft: -1, unsaved: ["nor-theme"] }).welcomed("google", { remembered: false }) });
  check(!(await popup(e.page)) && await signedIn(e.page), "signed in and offline, the page opens with no popup, still signed in");
  check(await e.page.evaluate(() => JSON.parse(localStorage.getItem("nor-google-sign-in"))?.changed?.includes("nor-theme")), "and the settings waiting for Google Drive stay waiting");
  await e.page.evaluate(() => { sessionStorage.setItem("net", "up"); window.netDown = false; dispatchEvent(new Event("online")); });
  await e.open();
  check(await popup(e.page), "the next visit online asks again");

  // Google's window cancelled, or blocked: the popup stays, saying so; trying again signs in
  const f = await device();
  google.answer = "deny";
  await expecting(/no token/, async () => {
    await f.page.click("#welcome-sign-in");
    await throughGuide(f.page);
    check(await orMissed(f.page.waitForFunction(() => !document.querySelector("#guide-dlg").open)), "Google answering closes the guide");
    check(await orMissed(f.page.waitForFunction(() => /did not finish/i.test(document.querySelector("#welcome-failed")?.textContent) && !document.querySelector("#welcome-failed").hidden))
      && await popup(f.page) && !(await signedIn(f.page)), "a cancelled Google window leaves the popup up, saying sign-in did not finish");
  });
  google.answer = "blocked";
  await expecting(/sign-in window/, async () => {
    await f.page.click("#welcome-sign-in");
    await throughGuide(f.page);
    await orMissed(f.page.waitForSelector("#welcome-failed", { state: "visible" }));
  });
  check(await popup(f.page) && await f.page.isVisible("#welcome-failed") && !(await signedIn(f.page)), "and so does a blocked one");
  google.answer = "grant";
  await f.page.click("#welcome-sign-in");
  await throughGuide(f.page);
  check(await orMissed(f.page.waitForFunction(() => !document.querySelector("#sign-out").hidden)) && !(await popup(f.page)), "trying again signs in and closes it");

  // trying again in the moment the popup says so, before the browser has told the page that the guide closed: the
  // guide opens again and its button still asks Google
  const k = await device();
  google.answer = "deny";
  await expecting(/no token/, async () => {
    await k.page.evaluate(() => {
      const said = document.querySelector("#welcome-failed");
      const seen = new MutationObserver(() => { if (said.hidden) return; seen.disconnect(); document.querySelector("#welcome-sign-in").click(); });
      seen.observe(said, { attributes: true, attributeFilter: ["hidden"] });
    });
    await k.page.click("#welcome-sign-in");
    await throughGuide(k.page);
    // the guide of the second try, its button not pressed yet
    await orMissed(k.page.waitForFunction(() => window.tokenClient?.asked.length === 1 && document.querySelector("#guide-dlg[open]:not(.waiting)")));
  });
  google.answer = "grant";
  const again = await guide(k.page);
  if (again) await k.page.click("#guide-go");
  check(!!again && await orMissed(k.page.waitForFunction(() => !document.querySelector("#sign-out").hidden)) && !(await popup(k.page)),
    "trying again as the first try fails signs in too" + (again ? "" : ": its guide did not open"));

  // the tip follows the avatar when the window is resized
  const g = await device({ on: w.device().welcomed("anonymous") });
  await g.page.setViewportSize({ width: 700, height: 800 });
  // the tip moves with the avatar once the page has laid the narrower window out
  await orMissed(g.page.waitForFunction(() => {
    const t = document.querySelector('.tip-bubble[data-tip="sign-in"]')?.getBoundingClientRect(), a = document.querySelector("#user-menu summary").getBoundingClientRect();
    return t && t.right <= innerWidth && t.left < a.right && t.right > a.left;
  }));
  const moved = await signInTip(g.page);
  check(moved && moved.inside && moved.under && moved.arrow, "the tip follows the avatar when the window narrows: " + JSON.stringify(moved));

  // a remembered anonymous choice beside a signed-in record (another tab signed in): the popup asks
  const h = await device({ on: w.device().signedInAs(ada, { unsaved: [] }).welcomed("anonymous") });
  check(await popup(h.page), "a remembered anonymous choice with someone signed in asks again");

  // two tabs: signing out in one is not undone by the other
  await h.page.keyboard.press("Escape");
  const h2 = await h.ctx.newPage(); // visits again on purpose (another tab is the subject): signing out in one tab reaches the other
  await h.on.visits("/web/index.html", { in: h2, until: "title" });
  await h2.keyboard.press("Escape");
  await h.page.click("#user-menu summary");
  await h.page.click("#sign-out");
  await orMissed(h2.waitForFunction(() => document.querySelector("#sign-out").hidden));
  check(await h2.evaluate(() => document.querySelector("#sign-out").hidden), "signing out in one tab signs the other out too");
  // signed out there, the other tab's change starts nothing that could write the record later: a sign-in written
  // back would be written by the click itself
  await h2.click("#theme");
  check(await h2.evaluate(() => localStorage.getItem("nor-google-sign-in")) === null, "and a change in the other tab does not sign the user back in");

  // no Google client
  w.site.withoutGoogleClient();
  const d = await device();
  check(!(await popup(d.page)) && !(await signInTip(d.page)), "with no Google client there is no popup and no tip");
} finally {
  await browser.close(); server.close();
}
