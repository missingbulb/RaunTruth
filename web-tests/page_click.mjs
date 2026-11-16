// A click that, when the element will not take it, says why: the element's chain up to the document, each
// ancestor that hides it, and the page's mode and view at that moment, so a failure seen only in CI names its cause.
//   await click(page, "#image-pick");
export async function click(page, selector, options) {
  try {
    await page.click(selector, options);
  } catch (e) {
    const seen = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return { found: false };
      const hiding = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (n.hidden || cs.display === "none" || cs.visibility === "hidden" || n.inert)
          hiding.push(`${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}${n.className && typeof n.className === "string" ? "." + n.className.trim().replace(/\s+/g, ".") : ""}${n.hidden ? " [hidden]" : ""} display=${cs.display} visibility=${cs.visibility}`);
      }
      const r = el.getBoundingClientRect(), root = document.documentElement;
      return { found: true, box: [r.x, r.y, r.width, r.height].map(Math.round), hiding, rootClass: root.className, data: { ...root.dataset }, title: document.title };
    }, selector).catch((x) => ({ unread: x.message }));
    e.message += "\nwhy: " + JSON.stringify(seen);
    throw e;
  }
}
