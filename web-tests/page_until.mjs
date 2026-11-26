import { frames } from "./page_frames.mjs";
// Waits until fn, run in the page with arg, resolves to something truthy, and gives what it resolved to, for the check
// after it to read the value the wait saw rather than read the page again. page.waitForFunction cannot do this for an
// async fn: it takes the promise fn returns as the truthy value, and resolves at once, on every engine.
export async function until(page, fn, arg, { timeout = 10000, every = 100 } = {}) {
  const end = Date.now() + timeout;
  let threw;
  for (;;) {
    // a navigation under way destroys the page's context, and what fn reads may not be there yet: not yet, rather
    // than a failure; the last such error is what the timeout says, so a wrong fn says why it never held
    const got = await page.evaluate(fn, arg).then((v) => { threw = null; return v; }, (e) => { threw = e; return false; });
    if (got) return got;
    if (Date.now() > end) throw new Error(`timed out after ${timeout} ms waiting for ${fn}` + (threw ? `; it last threw: ${String(threw.message ?? threw).split("\n")[0]}` : ""));
    await new Promise((ok) => setTimeout(ok, every)); // waits on purpose (no event): the poll's interval, an async fn having no event to wait on
  }
}

// Waits until the page's own work (web/pending.js) is done and stays done over a frame drawn after it, nothing begun
// meanwhile: what the page was doing has ended, and what that set off has been drawn. Fails where the page is then
// still calling an outside system: work it started and does not count.
export async function idle(page, { timeout = 10000 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    await page.waitForFunction(() => window.shellForTests?.work.pending === 0, null, { timeout: Math.max(1, end - Date.now()) });
    const begun = await page.evaluate(() => shellForTests.work.started);
    await frames(page);
    const at = await page.evaluate((n) => ({ rest: shellForTests.work.pending === 0 && shellForTests.work.started === n, wire: [...(window.callsOnTheWire || [])] }), begun);
    // a call still on its way with nothing counted is work web/pending.js does not know of, which the next step would race
    if (at.rest && at.wire.length) throw new Error(`the page says it is idle with a call on its way that it does not count as work: ${at.wire.join(", ")}`);
    if (at.rest) return;
    if (Date.now() > end) throw new Error(`the page was still working after ${timeout} ms`);
  }
}

// What a wait resolves to, or null once it fails, saying on stderr what was not seen: for a wait whose miss the test
// reads for itself in the check after it, rather than one quietly swallowed.
export const orMissed = (wait) => wait.then((x) => x ?? true, (e) => { console.error("not seen: " + String(e?.message ?? e).split("\n")[0]); return null; });

// Waits until fn, run here (async allowed), gives something truthy, looking again each time the promise wake() gives
// settles: something the test hears (a request reaching its stand-in, a page event), never a clock. What fn gave, or
// false once timeout has passed without it, for the check after it to say what is missing.
export async function untilHeard(fn, wake, { timeout = 10000 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    const got = await fn();
    if (got) return got;
    const left = end - Date.now();
    if (left <= 0) return false;
    let stop;
    await Promise.race([Promise.resolve(wake()).catch(() => {}), new Promise((ok) => { stop = setTimeout(ok, left); })]); // bounds a hang: what is never heard ends the wait
    clearTimeout(stop);
  }
}
