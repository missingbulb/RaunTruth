// What the page shows now, read in one go (explore.mjs): every control a person could reach, its text and whether it
// is enabled, and the state around them that a step can change, the stock taken after each step.
//   const now = await look(page);
//   {url, title, html, classes, status, notice, modal, dialogs, open, controls, focus, overflow, storage, vars}
// A control's key is its own id, or a path from the nearest ancestor with one: the same control keyed the same in
// every state, as a replay finds it again. vars: the shell-states vars this page shows (web-tests/explore/shell_oracle.py).

export const look = (page) => page.evaluate(() => {
  const SEL = "button, [role=button], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=tab], [role=option], "
    + "[role=checkbox], [role=switch], [role=treeitem], summary, a[href], input, select, textarea, canvas, [tabindex]:not([tabindex='-1'])";
  const keyOf = (el) => {
    if (!el || el === document.body) return "body";
    if (el.id) return "#" + CSS.escape(el.id);
    const parts = [];
    let e = el;
    while (e && e !== document.body && !e.id) {
      const tag = e.tagName.toLowerCase(), same = [...(e.parentElement?.children || [])].filter((c) => c.tagName === e.tagName);
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(e) + 1})` : tag);
      e = e.parentElement;
    }
    return (e && e.id ? "#" + CSS.escape(e.id) : "body") + " > " + parts.join(" > ");
  };
  const textOf = (el) => (el.getAttribute("aria-label") || el.innerText || (el.tagName === "INPUT" && el.type !== "range" ? el.placeholder || el.value : "")
    || el.title || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const ids = (el) => { const out = []; for (let e = el; e && e !== document; e = e.parentElement) if (e.id) out.push(e.id); return out; };
  const dialogs = [...document.querySelectorAll("dialog[open]")];
  const modal = dialogs.filter((d) => d.matches(":modal")).at(-1) || null;
  const W = innerWidth, H = innerHeight;
  const controls = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const inView = r.right > 0 && r.bottom > 0 && r.left < W && r.top < H;
    let reachable = true;
    if (inView) {
      const x = Math.min(Math.max(r.left + r.width / 2, 0), W - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), H - 1);
      const hit = document.elementFromPoint(x, y);
      reachable = !!hit && (hit === el || el.contains(hit) || hit.closest("label")?.control === el);
    }
    const a = el.tagName === "A" ? el : null;
    controls.push({
      key: keyOf(el), tag: el.tagName.toLowerCase(), type: el.type || "", role: el.getAttribute("role") || "", text: textOf(el),
      disabled: el.matches(":disabled") || el.getAttribute("aria-disabled") === "true", inScope: !modal || modal.contains(el), reachable,
      ids: ids(el), href: a ? a.href : "", external: !!a && new URL(a.href, location.href).origin !== location.origin, download: !!a?.hasAttribute("download"),
      selected: el.getAttribute("aria-selected"),
      pressed: el.getAttribute("aria-pressed") ?? el.getAttribute("aria-expanded") ?? (el.type === "checkbox" || el.type === "radio" ? String(el.checked) : null),
      value: ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && el.type !== "password" ? String(el.value).slice(0, 40) : null,
      options: el.tagName === "SELECT" ? [...el.options].filter((o) => !o.disabled).map((o) => o.value) : null,
      w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right),
    });
  }
  const html = document.documentElement;
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const storage = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); storage[k] = hash(localStorage.getItem(k) || ""); } } catch { /* storage refused: none to read */ }
  const vars = {};
  // the app itself, not a page the browser shows in its place (one of its own errors, a page of the site's)
  const app = !!window.shellForTests;
  vars.stage = html.dataset.stage ?? null;
  vars.annotating = html.hasAttribute("data-annotating");
  vars.managing = html.dataset.mode === "data";
  try { vars.signedIn = !!JSON.parse(localStorage.getItem("nor-google-sign-in") || "null")?.user; } catch { /* unreadable record: the var unread */ }
  vars.online = !html.classList.contains("offline");
  const view = document.querySelector("#view");
  if (view?.dataset.view) vars.view = view.dataset.view;
  if (view) vars.stack = view.hasAttribute("data-v3");
  const image = window.shellForTests?.page?.get("image");
  const kind = image ? { local: "local", preview: "preview", drive: "original" }[image.source?.kind] : "none";
  if (kind) vars.image = kind;
  const notice = document.querySelector("#notice");
  if (notice) vars.notice = !notice.hidden;
  const focused = document.activeElement;
  // what lies past the window's right edge, the page scrolling sideways: phone width's first failure
  const wide = html.scrollWidth > html.clientWidth + 1;
  return {
    url: location.pathname + location.search + location.hash, title: document.title, html: { ...html.dataset }, classes: [...html.classList].sort(),
    status: document.querySelector("#status")?.textContent.trim().slice(0, 120) ?? null,
    notice: notice && !notice.hidden ? notice.textContent.replace(/\s+/g, " ").trim().slice(0, 160) : null,
    modal: modal ? keyOf(modal) : null, dialogs: dialogs.map(keyOf).sort(),
    open: [...document.querySelectorAll("details[open]")].filter((d) => d.checkVisibility()).map(keyOf).sort(),
    controls, focus: { key: keyOf(focused), body: !focused || focused === document.body },
    overflow: wide ? { by: html.scrollWidth - html.clientWidth, past: [...document.querySelectorAll("body *")]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.right > html.clientWidth + 1 && r.width > 0 && e.checkVisibility(); }).slice(0, 5).map(keyOf) } : null,
    width: html.clientWidth, storage, vars, app, study: (location.pathname.match(/^\/web\/([\w-]*)/) || [])[1] ?? null,
  };
});
