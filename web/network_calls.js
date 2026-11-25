// The page's calls to other servers, shown while they are in flight (req/shell/status-bar/calls, req/setup/loading): beside the status
// line each server's logo turns and says what is read from it, and a call may be given a place on the page, which it empties of what
// was there, marks as loading, and keeps for the latest call alone. It makes no call itself: whoever calls tells it when one begins
// and when it ends.
"use strict";

const RECORDED = 200;

// bar: the element the calls in flight show in; servers: {key: {name, logo: SVG markup}}; failedFor: how long a failure stays said, ms
export function networkCalls({ bar, servers, failedFor = 6000 }) {
  // per server: its calls in flight, oldest first, its chip in the bar, and the timer of a failure still said
  const flying = new Map(), chips = new Map(), fading = new Map();
  // what became of each call given a place, latest last: {server, what, into, outcome: "painted" | "superseded" | "failed"}
  const record = [];
  // per place, the call that holds it
  const holder = new WeakMap();
  const note = (r) => { record.push(r); if (record.length > RECORDED) record.shift(); };

  function chipOf(key) {
    let c = chips.get(key);
    if (c) return c;
    c = document.createElement("span");
    c.className = "net-call"; c.dataset.server = key; c.setAttribute("role", "status");
    c.innerHTML = `<span class="net-logo" aria-hidden="true">${servers[key].logo}</span><span class="net-text"></span>`;
    chips.set(key, c); bar.append(c);
    return c;
  }
  function drop(key) { clearTimeout(fading.get(key)); fading.delete(key); chips.get(key)?.remove(); chips.delete(key); }
  function draw(key) {
    const calls = flying.get(key) || [];
    if (!calls.length) { if (!fading.has(key)) drop(key); return; }
    clearTimeout(fading.get(key)); fading.delete(key);
    // the oldest call that names what it reads speaks for the server
    const named = calls.find((c) => c.what) || calls[0], c = chipOf(key);
    c.classList.add("on"); c.classList.remove("failed");
    c.querySelector(".net-text").textContent = `${named.sending ? "Saving to" : "Loading from"} ${servers[key].name}${named.what ? ": " + named.what : "…"}`;
  }
  function failed(key, what) {
    const c = chipOf(key);
    c.classList.add("failed"); c.classList.toggle("on", !!flying.get(key)?.length);
    c.querySelector(".net-text").textContent = `${servers[key].name} did not answer${what ? ": " + what : ""}`;
    clearTimeout(fading.get(key));
    fading.set(key, setTimeout(() => { fading.delete(key); draw(key); }, failedFor));
  }

  // A call to `key`'s server begins; the function returned ends it, with the error it failed with if it did
  function begin(key, what = "", { sending = false } = {}) {
    const call = { what, sending }, calls = flying.get(key) || [];
    flying.set(key, calls); calls.push(call); draw(key);
    let over = false;
    return (err) => {
      if (over) return;
      over = true; calls.splice(calls.indexOf(call), 1);
      if (err) failed(key, what); else draw(key);
    };
  }
  // run()'s promise, shown as a call for as long as it takes
  function during(key, what, run, opts) {
    const end = begin(key, what, opts);
    return Promise.resolve().then(run).then((v) => { end(); return v; }, (e) => { end(e); throw e; });
  }
  // A call that fills `el`: what `el` held goes at once and a progress bar stands there. The caller asks `current` before it paints,
  // calls done() once the answer is in (false where a later call took the place, which then paints nothing) or failed(error).
  function fill(el, key, what, { also = [] } = {}) {
    holder.get(el)?.superseded();
    for (const x of also) x.replaceChildren();
    const wait = document.createElement("div");
    wait.className = "net-wait"; wait.setAttribute("role", "progressbar"); wait.setAttribute("aria-label", `Loading ${what} from ${servers[key].name}`);
    wait.innerHTML = '<span class="net-bar"></span><span class="net-say"></span>';
    wait.querySelector(".net-say").textContent = `Loading ${what} from ${servers[key].name}…`;
    el.replaceChildren(wait); el.setAttribute("aria-busy", "true");
    const end = begin(key, what), into = el.id || el.className || el.tagName.toLowerCase();
    let state = "flying";
    const settle = (outcome, err) => {
      if (state !== "flying") return false;
      state = outcome; end(err); note({ server: key, what, into, outcome });
      if (outcome !== "superseded") { wait.remove(); el.removeAttribute("aria-busy"); holder.delete(el); }
      return true;
    };
    const slot = {
      get current() { return state === "flying"; },
      done: () => settle("painted"),
      failed: (err) => settle("failed", err || new Error("failed")),
      superseded: () => settle("superseded"),
    };
    holder.set(el, slot);
    return slot;
  }
  return { begin, during, fill, record };
}
