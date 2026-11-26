// Drives the page (web/) in headless Chromium, with a worker that never answers, and checks
// req/shell/dialogs/focus-returns: when a dialog or menu closes (Close, Cancel, Esc, a choice) keyboard focus is back
// on the control that opened it, or, where that control went, on the one that leads back to it.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/dialog_focus_driver.mjs
import { pw, launch, mustHold } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { frames } from "./page_frames.mjs";
import { world } from "./world.mjs";

const { origin, server } = await serveSite({
  "/web/worker.js": "",
  "/web/version_history.json": "[]",
});

const browser = await launch(pw), w = world(browser, origin);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };

const page = await w.device().with({ reducedMotion: "reduce" }).visits("/web/index.html", { until: "none" });
await page.waitForFunction(() => $("#sb-version").textContent);

// what holds the keyboard: the element's id, or its menu's when it is a summary
const focus = () => page.evaluate(() => { const a = document.activeElement; return a === document.body ? "body" : a.id || (a.localName === "summary" ? a.parentElement.id + " summary" : a.localName); });
const settle = () => frames(page);

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
  await mustHold(f === "user-menu summary", `${what}: the avatar menu's button has the keyboard`, f);
}

// ---- a dialog opened from a button that stays ----
await page.focus("#sb-version");
await page.keyboard.press("Enter");
await page.waitForFunction(() => $("#history-dlg").open);
await page.keyboard.press("Escape");
await settle();
{ const f = await focus(); await mustHold(f === "sb-version", "Version history closed by Esc: the button that opened it has the keyboard", f); }

// ---- a menu closed by Esc ----
await page.focus("#user-menu summary");
await page.keyboard.press("Enter");
await page.waitForFunction(() => $("#user-menu").open);
await page.focus("#open-settings");
await page.keyboard.press("Escape");
await page.waitForFunction(() => !$("#user-menu").open);
await settle();
{ const f = await focus(); await mustHold(f === "user-menu summary", "the avatar menu closed by Esc: its button has the keyboard", f); }

// every dialog of both pages wears the page's own frame, a hairline and round corners, none the browser's
for (const [at, atLeast] of [["/web/index.html", 11], ["/web/setup.html", 14]]) {
  const p = await w.device().visits(at, { until: "none" });
  await p.waitForFunction(() => document.querySelectorAll("dialog").length > 0 && [...document.styleSheets].some((s) => /style\.css/.test(s.href || "")));
  const looks = await p.evaluate(() => [...document.querySelectorAll("dialog")].map((d) => { const c = getComputedStyle(d); return [d.id, c.borderTopWidth, parseFloat(c.borderTopLeftRadius)]; }));
  const odd = looks.filter(([, width, radius]) => width !== "1px" || !(radius > 0));
  await mustHold(looks.length >= atLeast && !odd.length, `the ${looks.length} dialogs of ${at} have the page's frame`, odd);
}
await done(0);
