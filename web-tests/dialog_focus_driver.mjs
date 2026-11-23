// Drives the page (web/) in headless Chromium, with a worker that never answers, and checks
// req/shell/dialogs/focus-returns: when a dialog or menu closes (Close, Cancel, Esc, a choice) keyboard focus is back
// on the control that opened it, or, where that control went, on the one that leads back to it.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/dialog_focus_driver.mjs
import { pw, launch } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { STEP } from "./deadlines.mjs";

const { origin, server } = await serveSite({
  "/web/worker.js": "",
  "/web/version_history.json": "[]",
});

const browser = await launch(pw);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen ? " " + JSON.stringify(seen) : "")); await done(1); } console.log("ok: " + what); };

const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
const page = await ctx.newPage();
page.setDefaultTimeout(STEP);
await page.goto(origin + "/web/index.html");
await page.waitForFunction(() => $("#sb-version").textContent);

// what holds the keyboard: the element's id, or its menu's when it is a summary
const focus = () => page.evaluate(() => { const a = document.activeElement; return a === document.body ? "body" : a.id || (a.localName === "summary" ? a.parentElement.id + " summary" : a.localName); });
const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// ---- a dialog opened from a menu item: its close lands on the menu's summary, which the menu closing hid the item from ----
for (const [item, dlg, close, what] of [
  ["#open-settings", "#settings-dlg", () => page.click("#settings-cancel"), "Settings closed by Cancel"],
  ["#open-settings", "#settings-dlg", () => page.keyboard.press("Escape"), "Settings closed by Esc"],
  ["#manage-storage", "#usage-dlg", () => page.keyboard.press("Escape"), "Manage storage closed by Esc"],
]) {
  await page.click("#user-menu summary");
  await page.click(item);
  await page.waitForFunction((d) => document.querySelector(d).open, dlg);
  await close();
  await page.waitForFunction((d) => !document.querySelector(d).open, dlg);
  await settle();
  const f = await focus();
  await check(f === "user-menu summary", `${what}: the avatar menu's button has the keyboard`, f);
}

// ---- a dialog opened from a button that stays ----
await page.focus("#sb-version");
await page.keyboard.press("Enter");
await page.waitForFunction(() => $("#history-dlg").open);
await page.keyboard.press("Escape");
await settle();
{ const f = await focus(); await check(f === "sb-version", "Version history closed by Esc: the button that opened it has the keyboard", f); }

// ---- a menu closed by Esc ----
await page.focus("#user-menu summary");
await page.keyboard.press("Enter");
await page.waitForFunction(() => $("#user-menu").open);
await page.focus("#open-settings");
await page.keyboard.press("Escape");
await page.waitForFunction(() => !$("#user-menu").open);
await settle();
{ const f = await focus(); await check(f === "user-menu summary", "the avatar menu closed by Esc: its button has the keyboard", f); }
await done(0);
