// When the page's background work runs: every cadence, debounce and deadline it keeps, in one place.
import { work } from "./pending.js";

// fn every ms; while the tab is hidden it rests, unless whenHidden, and once shown runs at once when ms has passed.
// Returns what stops it.
export function every(ms, fn, { whenHidden = false } = {}) {
  let id = 0, last = Date.now();
  const run = () => { last = Date.now(); fn(); };
  const rest = () => { clearInterval(id); id = 0; };
  const seen = () => {
    if (document.hidden) return rest();
    if (id) return;
    if (Date.now() - last >= ms) run();
    id = setInterval(run, ms);
  };
  if (!whenHidden) document.addEventListener("visibilitychange", seen);
  if (whenHidden || !document.hidden) id = setInterval(run, ms);
  return () => { rest(); document.removeEventListener("visibilitychange", seen); };
}

// fn once ms after the last call, a run of calls answered once; .cancel() drops the one waiting. From the first call
// until what fn returns has settled, or the wait is dropped, it is work the page is doing.
export function settle(ms, fn) {
  let id = 0, end = null;
  const run = (...a) => {
    const over = end;
    end = null;
    let made;
    try { made = fn(...a); } finally { Promise.resolve(made).then(over, over); }
  };
  const soon = (...a) => { clearTimeout(id); end ||= work.begin("a run of calls waiting to be answered once"); id = setTimeout(run, ms, ...a); };
  soon.cancel = () => { clearTimeout(id); end?.(); end = null; };
  return soon;
}

// what promise settles to, or otherwise once ms has passed without it.
export function within(ms, promise, otherwise) {
  let id = 0;
  return Promise.race([promise, new Promise((ok) => { id = setTimeout(ok, ms, otherwise); })]).finally(() => clearTimeout(id));
}

// fn once, ms from now. Returns what cancels it.
export function after(ms, fn) {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
}
