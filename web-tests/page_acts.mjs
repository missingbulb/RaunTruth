// A person's actions on a page of the site, each ending once the page has ended the work it set off (its own count of
// its work, web/pending.js, read by idle()), so the step after reads what the action caused with no wait of its own.
// The World's device settles each page it opens; unsettled(page) is the same page acting without waiting, for a case
// that reads what shows while the work is under way.
//   await page.click("#gt-send");                         ends with the upload done and its message shown
//   check(/Uploaded/.test(await page.textContent("#gt-msg")), "...");
//   await unsettled(page).click("#count");                ends as soon as the click is made
import { idle } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";

const PAGE = ["click", "dblclick", "fill", "press", "check", "uncheck", "setInputFiles", "selectOption", "tap", "type"];
const KEYBOARD = ["press", "type", "insertText"];
const MOUSE = ["click", "dblclick", "up"];
const raw = new WeakMap();

// what an action left: the work it set off ended; a page it took elsewhere, the new document's work too
async function after(page) {
  if (page.isClosed()) return;
  for (let tries = 0; ; tries++) {
    try {
      if (!await page.evaluate(() => !!window.shellForTests?.work)) return;
      return await idle(page, { timeout: STEP }).catch(async (e) => {
        const doing = await page.evaluate(() => window.shellForTests?.work.doing).catch(() => null);
        throw doing?.length ? new Error(`the action's work never ended (${doing.join(", ")}): act with unsettled(page) where the case holds it on purpose`) : e;
      });
    } catch (e) {
      if (page.isClosed() || !/context was destroyed|navigat|Target .*closed/i.test(e.message) || tries > 2) {
        if (page.isClosed()) return;
        throw e;
      }
      if (!page.isClosed()) await page.waitForLoadState();
    }
  }
}

function wrap(target, names, page, into) {
  for (const name of names) {
    const act = target[name].bind(target);
    into[name] = act;
    target[name] = async (...a) => { const r = await act(...a); await after(page); return r; };
  }
}

export function settle(page) {
  if (raw.has(page)) return page;
  const plain = { keyboard: {}, mouse: {} };
  wrap(page, PAGE, page, plain);
  wrap(page.keyboard, KEYBOARD, page, plain.keyboard);
  wrap(page.mouse, MOUSE, page, plain.mouse);
  raw.set(page, plain);
  return page;
}

// the page's actions as Playwright makes them, ending as soon as each is made
const plainOf = (target, plain) => new Proxy(target, { get: (t, k) => (k in plain ? plain[k] : Reflect.get(t, k)) });
export function unsettled(page) {
  const plain = raw.get(page);
  if (!plain) return page;
  const { keyboard, mouse, ...own } = plain, kb = plainOf(page.keyboard, keyboard), ms = plainOf(page.mouse, mouse);
  return new Proxy(page, { get: (p, k) => (k === "keyboard" ? kb : k === "mouse" ? ms : k in own ? own[k] : Reflect.get(p, k)) });
}
