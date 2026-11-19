import { frames } from "./page_frames.mjs";
// Waits until fn, run in the page with arg, resolves to something truthy. page.waitForFunction cannot do this for an
// async fn: it takes the promise fn returns as the truthy value, and resolves at once, on every engine.
export async function until(page, fn, arg, { timeout = 10000, every = 100 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    // a navigation under way destroys the page's context: not yet, rather than a failure
    if (await page.evaluate(fn, arg).catch(() => false)) return;
    if (Date.now() > end) throw new Error(`timed out after ${timeout} ms waiting for ${fn}`);
    await new Promise((ok) => setTimeout(ok, every)); // waits on purpose: the poll's interval, an async fn having no event to wait on
  }
}

// Waits until the page's own work (web/pending.js) is done and stays done over a frame drawn after it, nothing begun
// meanwhile: what the page was doing has ended, and what that set off has been drawn.
export async function idle(page, { timeout = 10000 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    await page.waitForFunction(() => window.shellForTests?.work.pending === 0, null, { timeout: Math.max(1, end - Date.now()) });
    const begun = await page.evaluate(() => shellForTests.work.started);
    await frames(page);
    if (await page.evaluate((n) => shellForTests.work.pending === 0 && shellForTests.work.started === n, begun)) return;
    if (Date.now() > end) throw new Error(`the page was still working after ${timeout} ms`);
  }
}

// What a wait resolves to, or null once it fails, saying on stderr what was not seen: for a wait whose miss the test
// reads for itself in the check after it, rather than one quietly swallowed.
export const orMissed = (wait) => wait.then((x) => x ?? true, (e) => { console.error("not seen: " + String(e?.message ?? e).split("\n")[0]); return null; });
