// Study Setup's sharing (req/setup/sharing-check, req/setup/people): what a study's stage needs of its sharing in the store, the
// corrections that make it so, and who holds which of the three shares. The rules and the reading of People are plain
// functions of what the store lists (permissions); the panel draws them and changes one item's sharing only when the owner
// presses that correction's Fix and confirms.
"use strict";
import { CONNECTION } from "./offline.js";
import { work } from "./pending.js";
import { STAGES, stageOf } from "./stages.js";

export { STAGES, stageOf };

// per stage: how the root is shared, and whether people annotate (someone must write the extractions folder). Before Review the
// root is for named people; from Review on the study opens by its address. In every stage the items below are readable by link
export const RULES = {
  Setup: { root: "named", annotating: true },
  Develop: { root: "named", annotating: true },
  Analyze: { root: "named", annotating: true },
  Review: { root: "link", annotating: false },
  Public: { root: "link", annotating: false },
};
const BY_LINK = ["data", "previews", "extractions", "file"];
const WRITES = ["owner", "organizer", "fileOrganizer", "writer"];
const PERSON = ["user", "group"];
const HANDS_IN = "hands in work";

const WHY = {
  named: "Before Review the root is for the study's named people: anyone with a link could open its files.",
  link: "From Review on the study opens by its address, so its root is shared by link.",
  linked: "Visitors and the lab read it with no sign-in, so it is shared by link.",
  writer: "In this stage people analyse images: someone must be able to add files to the Analysis folder.",
  linkEdit: "Anyone with the link may edit it, which no stage allows; a link that only reads is offered once this is off.",
  unread: "This account may not read its sharing from here, so the page cannot check it.",
};

// The corrections the stage's rules ask of items [{kind: root | data | previews | extractions | file, id, label, perms}], perms
// what the store lists on the item ([{id, type, role, emailAddress}]) or null where it could not be read. Each is {key, kind, id, label, link,
// change, why, how: "share" | "unshare" | "ask", permission, picture}; "ask" ones the site cannot make. An item absent from items has none.
export function corrections(stage, items, sharing) {
  const rule = RULES[stage] || RULES.Develop, out = [];
  for (const it of items) {
    const at = { kind: it.kind, id: it.id, label: it.label, link: sharing.link(it.kind, it.id) };
    const add = (how, change, why, picture, permission) => out.push({ key: `${it.kind}:${it.id}:${how}`, ...at, how, change, why, picture, permission });
    if (!it.perms) { add("ask", sharing.check, WHY.unread, null); continue; }
    const anyone = it.perms.find((p) => p.type === "anyone");
    if (it.kind === "root") {
      if (rule.root === "named" && anyone) add("unshare", "Make it shared with named people only", WHY.named, "named", anyone.id);
      if (rule.root === "link" && !anyone) add("share", "Share the root by link", WHY.link, "link");
    } else if (BY_LINK.includes(it.kind) && !anyone) add("share", "Share it by link", WHY.linked, "link");
    const wide = it.perms.find((p) => p.type === "anyone" && WRITES.includes(p.role));
    if (wide && !(it.kind === "root" && rule.root === "named")) { add("unshare", "Take off the link's edit access", WHY.linkEdit, "named", wide.id); out[out.length - 1].edit = true; }
    if (it.kind === "extractions" && rule.annotating && !it.perms.some((p) => p.type !== "anyone" && WRITES.includes(p.role))) {
      add("ask", "Share it with someone who may edit it", WHY.writer, "editor");
    }
  }
  return out;
}

// Who holds which of the three shares, from the root's and the extractions folder's items: {members: [{email, name, holds}], link}.
// holds, in order, "sees" (reads the root), "hands in work" (writes the Analysis folder), "manages" (writes the root); link whether the
// root is shared by link
export function people(items) {
  const found = new Map(), root = items.find((i) => i.kind === "root"), extractions = items.find((i) => i.kind === "extractions");
  const hold = (perms, held, roles) => {
    for (const p of perms || []) {
      if (!PERSON.includes(p.type) || !p.emailAddress) continue;
      const m = found.get(p.emailAddress) || { email: p.emailAddress, name: p.name || null, held: new Set() };
      found.set(p.emailAddress, m);
      for (const [name, ok] of roles(p)) if (ok) m.held.add(name);
    }
  };
  hold(root?.perms, "root", (p) => [["sees", true], ["manages", WRITES.includes(p.role)]]);
  hold(extractions?.perms, "extractions", (p) => [[HANDS_IN, WRITES.includes(p.role)]]);
  const order = ["sees", HANDS_IN, "manages"];
  return { members: [...found.values()].map((m) => ({ email: m.email, name: m.name, holds: order.filter((h) => m.held.has(h)) })).filter((m) => m.holds.length),
    link: !!root?.perms?.some((p) => p.type === "anyone") };
}

// c.then: the item whose link went with this one's, which the same Confirm then shares by link itself
const CONFIRM = {
  share: (c) => `${c.label} will be shared with anyone with the link, to view.`,
  unshare: (c) => (c.then ? CONFIRM.plain(c) + ` ${c.then.label} is read with no sign-in, so it will then be shared by link itself.` : CONFIRM.plain(c)),
  plain: (c) => c.edit ? `Anyone with the link will no longer edit ${c.label.toLowerCase()}; the people named on it keep their access.` : `Anyone with the link will no longer open ${c.label.toLowerCase()}; the people named on it keep their access.`,
};

// ctx: what the shell lends it, named below where it is used
export function sharingPanel(ctx) {
  const { $, remote, account, place, calls } = ctx;
  const sd = remote.writer(account);
  const box = $("#sharing-box"), root = document.documentElement;
  // manifest and who: the study and account last mounted; last: what the check found; confirming: the key of the correction whose Fix awaits its
  // confirmation; refused: the keys the store refused the change of, which then show no Fix
  let manifest = null, who = null, epoch = 0, shownOn = false, last = null, confirming = null, refused = new Set();
  const offline = () => root.classList.contains("offline");
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v); }
    e.append(...kids.filter(Boolean));
    return e;
  };
  const say = (text, err) => { const s = $("#sharing-state"); s.textContent = text; s.classList.toggle("err", !!err); };

  async function read() {
    const s = await place.settings({ fresh: true });
    const top = place.root();
    if (!top || !s) return null;
    const folders = (s.folders || []).filter((id) => id !== top);
    const names = await Promise.all(folders.map((id) => remote.name(id).catch(() => null)));
    const spec = [{ kind: "root", id: top, label: "The study's root" },
      ...folders.map((id, k) => ({ kind: "data", id, label: `The "${names[k] || "data"}" folder` })),
      ...(s.previews ? [{ kind: "previews", id: s.previews, label: "The Previews folder" }] : []),
      ...(s.extractions ? [{ kind: "extractions", id: s.extractions, label: "The Analysis folder" }] : []),
      ...(s.file ? [{ kind: "file", id: s.file, label: "The study file" }] : [])];
    const items = await Promise.all(spec.map(async (it) => ({ ...it, perms: await remote.permissions(it.id).catch((e) => { console.warn(`${it.label}'s sharing was not read:`, e); return null; }) })));
    return { stage: stageOf(s, manifest), items };
  }

  // the study's sharing read afresh and drawn; the one place the page asks the store about sharing
  function check() {
    if (offline() || !manifest) return Promise.resolve();
    const of = ++epoch;
    box.dataset.state = "checking"; $("#sharing-recheck").disabled = true; say("Checking the study's sharing…");
    return work.during((async () => {
      let got = null;
      try { got = await calls.during("store", "the study's sharing", read); } catch (e) { if (of === epoch) say(e.message || String(e), true); }
      if (of !== epoch) return;
      last = got;
      draw();
      box.dataset.state = "done"; box.dataset.checks = String(+box.dataset.checks + 1); $("#sharing-recheck").disabled = false;
    })(), "the study's sharing checked");
  }

  function draw() {
    const list = $("#sharing-corrections"), folks = $("#people-list");
    if (!last) { list.replaceChildren(); folks.replaceChildren(); return; }
    $("#sharing-title").textContent = `Sharing (${last.stage})`;
    const fixes = corrections(last.stage, last.items, remote.sharing);
    say(fixes.length ? `${fixes.length} thing${fixes.length === 1 ? "" : "s"} to change for this stage:` : "Sharing is as this stage needs.");
    list.replaceChildren(...fixes.map(card));
    const { members, link } = people(last.items);
    const rootItem = last.items.find((i) => i.kind === "root"), gt = last.items.find((i) => i.kind === "extractions");
    const others = members.filter((m) => m.holds.includes(HANDS_IN) && m.email !== account.email()).map((m) => m.email);
    const hands = !gt ? null : others.length ? `${others.join(", ")} can hand in work.` : "Nobody but you can hand in work.";
    folks.replaceChildren(
      ...(link ? [h("li", { class: "people-link", text: "Anyone with the link reads the root." })] : []),
      ...(members.length || link ? [] : [h("li", { class: "hint", text: "No one is named on the root or the Analysis folder." })]),
      ...members.map((m) => h("li", { "data-email": m.email }, h("span", { class: "who", text: m.name ? `${m.name} (${m.email})` : m.email }), " ",
        ...m.holds.map((x) => h("span", { class: "holds", text: x }))
          .flatMap((s) => [s, " "]))),
      hands && h("li", { class: "people-hands", text: hands }),
      h("li", { class: "people-where" }, ...[[rootItem, "Root sharing"], [gt, "Analysis folder sharing"]].filter(([i]) => i).flatMap(([i, text]) =>
        [h("a", { href: remote.sharing.link("folder", i.id), target: "_blank", rel: "noopener", text }), " "])));
  }

  // the study file, where taking the link off the root is what the correction asks: its own link is then made in the same press
  const follows = (c) => (c.kind === "root" && c.how === "unshare" && !c.edit ? last?.items.find((i) => i.kind === "file") || null : null);
  function card(c) {
    c.then = follows(c);
    const [src, alt] = remote.sharing.pictures[c.picture] || [];
    const fixable = c.how !== "ask" && !refused.has(c.key);
    const actions = h("div", { class: "sharing-actions" });
    if (confirming === c.key) {
      actions.classList.add("sharing-confirm");
      actions.append(h("p", { text: CONFIRM[c.how](c) }),
        h("button", { class: "sharing-confirm-go primary", type: "button", "data-needs-network": "", text: "Confirm" }),
        h("button", { class: "sharing-confirm-cancel", type: "button", text: "Cancel" }));
      actions.querySelector(".sharing-confirm-go").onclick = () => fix(c);
      actions.querySelector(".sharing-confirm-cancel").onclick = () => { confirming = null; draw(); focusOn(c.key, ".sharing-fix"); };
    } else if (fixable) {
      actions.append(h("button", { class: "sharing-fix", type: "button", "data-needs-network": "", "aria-label": `Fix: ${c.change}`, text: "Fix" }));
      actions.querySelector(".sharing-fix").onclick = () => { confirming = c.key; draw(); focusOn(c.key, ".sharing-confirm-go"); };
    }
    return h("li", { class: "sharing-correction", "data-key": c.key },
      h("strong", { class: "sharing-item", text: c.label }), h("span", { class: "sharing-change", text: c.change }), actions,
      h("p", { class: "hint sharing-why", text: c.why }),
      refused.has(c.key) && h("p", { class: "hint sharing-refused", text: remote.sharing.refused }),
      h("a", { class: "sharing-where", href: c.link, target: "_blank", rel: "noopener", text: remote.sharing.open }),
      src && h("details", { class: "sharing-how" }, h("summary", { text: "Show how" }), h("img", { src, alt, width: "280", height: "150" })));
  }
  // the control of a correction, focused again once the list is drawn afresh
  const focusOn = (key, cls) => $(`#sharing-corrections [data-key="${CSS.escape(key)}"] ${cls}`)?.focus();

  // the one change of sharing the page makes, once the owner confirmed it; the store refusing it takes the Fix off that correction
  async function fix(c) {
    confirming = null;
    try {
      await work.during(calls.saving("store", "Changed the sharing, as the correction said.", async () => {
        await (c.how === "share" ? sd.share(c.id) : sd.unshare(c.id, c.permission));
        // the item that was read through this one's link gets its own, where it has none; refused, the first change stands and the
        // check that follows shows its correction
        if (!c.then) return;
        try {
          const perms = await remote.permissions(c.then.id);
          if (!perms.some((p) => p.type === "anyone")) await sd.share(c.then.id);
        } catch (e) { console.warn(`${c.then.label} was not shared by link:`, e); }
      }), "an item's sharing changed");
    } catch (e) {
      if (e.status === 403 || e.status === 404) refused.add(c.key);
      else { draw(); say(e.message || String(e), true); return; }
    }
    return check();
  }

  $("#sharing-recheck").onclick = () => check();
  addEventListener(CONNECTION, (e) => { if (e.detail.online && shownOn && !last) check(); });

  return {
    opened() {},
    // a study comes in (or the user signs in or out): the sharing read for it afresh once Study Setup shows
    mount(m) {
      if (manifest && m.id === manifest.id && account.email() === who) { manifest = m; return; }
      epoch++; manifest = m; who = account.email(); shownOn = false; last = null; confirming = null; refused = new Set();
      box.dataset.state = "checking"; box.dataset.checks = "0"; draw();
    },
    signedIn() { if (manifest && account.email() !== who) this.mount(manifest); },
    // Study Setup's page opened for someone the store lets write the root, or not: the sharing is checked on opening
    open(on) { const was = shownOn; shownOn = !!on; if (on && !was) check(); },
    // the stage changed, by a promotion or a move back: the sharing is checked again
    recheck: () => (shownOn ? check() : Promise.resolve()),
    get on() { return false; },
  };
}
