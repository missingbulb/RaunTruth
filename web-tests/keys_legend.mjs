// The image's keys legend as a test sees it (req/shell/image/keys), for any study's page driver.

// each row shown: its key, its label, and whether it is filled blue
export const BLUE = /^rgba?\(\s*\d{1,2},\s*\d+,\s*2\d\d(,\s*1)?\)$/;
export const legend = (page) => page.evaluate((blue) => [...document.querySelectorAll(".keys-legend .key-chip")].filter((b) => b.checkVisibility())
  .map((b) => ({ key: b.nextElementSibling?.checkVisibility() ? b.nextElementSibling.textContent.trim() : null, label: b.textContent.trim(),
    lit: new RegExp(blue).test(getComputedStyle(b).backgroundColor) })), BLUE.source);
export const legendKeys = async (page) => (await legend(page)).map((r) => r.key).join(" ");
export const legendRows = async (page) => (await legend(page)).map((r) => `${r.label} ${r.key}`).join(", ");

// An init script keeping every keydown listener a study's own script adds, so a test can hand each of them a key
// and see whether any acts on it: the shell is to be the only one that does.
export const keepStudyKeyListeners = (ctx) => ctx.addInitScript(() => {
  const kept = (window.studyKeyListeners = []), add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (type === "keydown" && /\/studies\/[^/]+\/web\//.test(new Error().stack || "")) kept.push(fn);
    return add.call(this, type, fn, o);
  };
});
// the keys (codes, each with its modifiers: {code, ctrlKey, altKey}) that some listener the study added took from
// the page, and how many listeners it added
export const studyTakes = (page, keys) => page.evaluate((keys) => {
  const took = [];
  for (const k of keys) for (const fn of window.studyKeyListeners) {
    let prevented = false;
    const e = { type: "keydown", key: k.code.replace(/^Key/, "").toLowerCase(), repeat: false, isComposing: false, keyCode: 0, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
      ...k, target: document.body, preventDefault() { prevented = true; }, stopPropagation() {} };
    try { typeof fn === "function" ? fn(e) : fn.handleEvent(e); } catch { /* a listener reading what a stand-in event lacks acts on nothing */ }
    if (prevented) took.push(k.code);
  }
  return { took, listeners: window.studyKeyListeners.length };
}, keys);
