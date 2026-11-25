// The status bar's resources (req/shell/status-bar/resources, req/shell/status-bar/network, req/shell/status-bar/cpu, req/shell/status-bar/rolling,
// req/shell/resources-dialog): the Resource Usage dialog with a tab each for storage, memory, network and CPU; the four folded into one icon,
// unfolding on hover and while one needs watching; their numbers rolling to each new value; and the meters of what this tab downloads and how
// busy its threads are. It needs of the shell the store's count of bytes received, what the page keeps and Python's state.
"use strict";
import { remote } from "./drive.js";
import { every } from "./pacing.js";

export function statusResources(shell) {
  const { $, storageTab, ramList, readJSON, RESOURCES, writeJSON, memoryNow, still, sizeText, entry } = shell;
  // ---------- the resources dialog: storage, memory, network and CPU, a tab each ----------
  let usageTab = null;
  const tabOn = (t) => $("#usage-dlg").open && usageTab === t;
  function usage(tab) {
    const d = $("#usage-dlg"), again = tabOn(tab);
    usageTab = tab; d.dataset.tab = tab;
    for (const b of d.querySelectorAll("[role=tab]")) b.setAttribute("aria-selected", b.dataset.tab === tab);
    for (const p of d.querySelectorAll("[role=tabpanel]")) p.hidden = p.dataset.tab !== tab;
    if (!d.open) d.showModal();
    if (tab === "storage") storageTab(!again);
    else if (tab === "memory") ramList();
    else usageNow();
  }
  $("#usage-dlg .tab-row").onclick = (e) => { const t = e.target.closest("[role=tab]"); if (t) usage(t.dataset.tab); };

  // ---------- the resources block: the disk, memory, network and CPU folded into one icon ----------
  // (req/shell/status-bar/resources) Autohide checked, it unfolds while hovered, and while something needs watching: the
  // CPU over RAISE_CPU or the network over RAISE_RATE for RAISE_AFTER_MS, the tab over RAISE_RAM; it folds
  // RAISE_LINGER_MS after the last of them ends.
  const RAISE_CPU = 0.5, RAISE_RATE = 250 * 1024, RAISE_RAM = 2 ** 30, RAISE_AFTER_MS = 5000, RAISE_LINGER_MS = 8000;
  const raise = { cpuSince: null, netSince: null, until: 0 };
  function showResources() {
    const kept = readJSON(RESOURCES, "auto"), open = kept === "open";
    // a kept value other than "open" or "auto" reads as auto-hiding, and is forgotten
    if (kept !== "auto" && !open) try { localStorage.removeItem(RESOURCES); } catch { /* no storage */ }
    $("#sb-res").dataset.mode = open ? "open" : "auto";
    $("#res-mode").checked = !open;
  }
  showResources();
  $("#res-mode").onchange = (e) => { writeJSON(RESOURCES, e.target.checked ? "auto" : "open"); showResources(); };
  $("#sb-res-icon").onclick = () => usage(usageTab || "storage");
  $("#sb-online").onclick = () => usage("storage"); // where the page installs as an app and each study is made available offline
  function raiseResources(cpuShare, rate) {
    const t = Date.now(), long = (since) => since != null && t - since > RAISE_AFTER_MS;
    raise.cpuSince = cpuShare > RAISE_CPU ? raise.cpuSince ?? t : null;
    raise.netSince = rate > RAISE_RATE ? raise.netSince ?? t : null;
    const watch = long(raise.cpuSince) || long(raise.netSince) || memoryNow().total > RAISE_RAM;
    if (watch) raise.until = t + RAISE_LINGER_MS;
    $("#sb-res").classList.toggle("raised", t < raise.until);
  }
  // ---------- the status bar's numbers: each changed character rolls up to its new one ----------
  // Characters are paired from the right, so "9%" to "12%" rolls the 9 to a 2 and brings the 1 in from nothing;
  // the old character is the rolling one's data-from, so the number reads as its new value throughout.
  const SHARP_CPU = 0.3, SHARP_RATE = 2 ** 20;
  // the flash is the stylesheet's spike animation; a new spike plays it again from its start
  function showNumber(item, text, spike) {
    if (spike && !still()) {
      // the item and its icon play it; asked of them alone, so no animation of a rolling digit is held after it is gone
      if (item.classList.contains("spike")) for (const el of [item, item.querySelector("svg")]) for (const a of el?.getAnimations() || []) if (a.animationName === "spike") { a.cancel(); a.play(); }
      item.classList.add("spike");
      if (!item.onanimationend) item.onanimationend = item.onanimationcancel = (e) => { if (e.target === item && e.animationName === "spike") item.classList.remove("spike"); }; // ends with animations off: none starts then (still()), and one running is cancelled, which clears it
    }
    const v = item.querySelector(".v"), was = v.textContent;
    if (text === was) return;
    if (!was) { v.textContent = text; return; }
    v.replaceChildren(...[...text].map((ch, i) => {
      const from = was[was.length - text.length + i] ?? "";
      if (from === ch || ch === " ") return ch;
      const roll = document.createElement("span"), d = document.createElement("span");
      roll.className = "roll"; d.dataset.from = from; d.textContent = ch; roll.append(d);
      return roll;
    }));
  }


  // ---------- what this tab downloads ----------
  // A browser gives a page no total, so it is summed from three places. The page's and Python's own timings,
  // which give 0 for what the service worker answered and for a site that keeps its sizes from other pages;
  // the service worker's, for what it fetched for this page and for its Python (sw.js); and the remote store's, which
  // counts its own. From the browser's caches nothing is downloaded and nothing counts.
  const net = { page: 0, worker: 0, sw: {} };
  try {
    net.page = performance.getEntriesByType("navigation")[0]?.transferSize || 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) net.page += e.transferSize || 0; }).observe({ type: "resource", buffered: true });
  } catch { /* no timings: the service worker's and the remote store's counts alone */ }
  // the service worker's counts, by client: a count lower than the last is a new service worker counting from 0
  function swCounted({ page, workers }) {
    for (const [id, n, role] of [[page.id, page.bytes, "page"], ...Object.entries(workers).map(([id, n]) => [id, n, "worker"])]) {
      const c = net.sw[id] ||= { role, last: 0, before: 0 };
      if (n < c.last) c.before += c.last;
      c.last = n;
    }
  }
  navigator.serviceWorker?.addEventListener("message", (e) => { if (e.data?.type === "net") swCounted(e.data); });
  const askSw = () => navigator.serviceWorker?.controller?.postMessage({ type: "net", workers: Object.keys(net.sw).filter((id) => net.sw[id].role === "worker") });
  function netNow() {
    const sw = (role) => Object.values(net.sw).filter((c) => c.role === role).reduce((a, c) => a + c.before + c.last, 0);
    const page = net.page + sw("page"), python = net.worker + sw("worker"), store = remote.received();
    return { page, python, store, total: page + python + store };
  }
  // how fast: what was downloaded over the last CPU_MS, as the CPU's share is counted
  const netSamples = [];
  function netRate(total) {
    const t = Date.now();
    netSamples.push([t, total]);
    while (netSamples.length > 1 && netSamples[1][0] <= t - CPU_MS) netSamples.shift();
    const [t0, n0] = netSamples[0];
    return t > t0 ? ((total - n0) * 1000) / (t - t0) : 0;
  }
  const speedText = (r) => `${sizeText(r)}/s`;
  function netList(n, rate) {
    const off = document.documentElement.classList.contains("offline") ? "Offline: no internet. " : "";
    $("#net-total").textContent = `${off}This tab is downloading ${speedText(rate)} and has downloaded ${sizeText(n.total)} since it opened.`;
    $("#net-list").replaceChildren(
      entry("The page", "Its own files; what this browser had kept counts nothing", sizeText(n.page)),
      entry("Python", "Python, its packages and the study's Python", sizeText(n.python)),
      entry(remote.label, "Images and folder lists; not its small pictures of images", sizeText(n.store)));
  }

  // ---------- how busy this tab's threads are ----------
  // The page's thread: its long tasks, which only Chrome and Edge report (null elsewhere: unknown). Python's: the
  // time it has spent working, as its last message said ({ms, since}, since set while it works), sampled each
  // second. Each is a share of one core over the last CPU_MS.
  const CPU_MS = 2000;
  const cpu = { long: PerformanceObserver.supportedEntryTypes?.includes("longtask") ? [] : null, py: { ms: 0, since: null }, samples: [] };
  if (cpu.long) new PerformanceObserver((l) => { for (const e of l.getEntries()) cpu.long.push([e.startTime, e.startTime + e.duration]); }).observe({ type: "longtask" });
  function cpuNow() {
    const now = performance.now(), from = now - CPU_MS;
    let page = null;
    if (cpu.long) {
      cpu.long = cpu.long.filter(([, end]) => end > from);
      page = cpu.long.reduce((a, [start, end]) => a + end - Math.max(start, from), 0) / CPU_MS;
    }
    const t = Date.now(), worked = cpu.py.ms + (cpu.py.since ? t - cpu.py.since : 0);
    cpu.samples.push([t, worked]);
    while (cpu.samples.length > 1 && cpu.samples[1][0] <= t - CPU_MS) cpu.samples.shift();
    const [t0, w0] = cpu.samples[0], python = t > t0 ? Math.min(1, (worked - w0) / (t - t0)) : 0;
    return { page, python, total: (page || 0) + python };
  }
  const pct = (x) => (x == null ? "–" : Math.round(x * 100) + "%");
  function cpuList(c) {
    $("#cpu-total").textContent = `This tab's threads are using about ${pct(c.total)} of one core.`;
    $("#cpu-list").replaceChildren(
      entry("The page", c.page == null ? "Unknown: only Chrome and Edge report it" : "Its long tasks: an estimate", pct(c.page)),
      entry("Python", "The time it spent working", pct(c.python)));
  }

  // each second: the network and CPU in the status bar, and in their tabs when open; a sharp rise flashes
  const last = { rate: 0, cpu: 0 };
  const sharp = (now, was, step) => now >= 2 * was && now - was >= step;
  function usageNow() {
    const n = netNow(), c = cpuNow(), rate = netRate(n.total);
    showNumber($("#sb-net"), speedText(rate), sharp(rate, last.rate, SHARP_RATE));
    showNumber($("#sb-cpu"), pct(c.total), sharp(c.total, last.cpu, SHARP_CPU));
    last.rate = rate; last.cpu = c.total;
    raiseResources(c.total, rate);
    if (tabOn("network")) netList(n, rate);
    if (tabOn("cpu")) cpuList(c);
  }
  every(1000, usageNow, { whenHidden: true });
  every(2000, askSw, { whenHidden: true });
  askSw(); usageNow();

  return { showNumber, tabOn, usage, cpu, net, showResources };
}
