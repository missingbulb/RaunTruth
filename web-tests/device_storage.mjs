// What a device keeps for the page, for a test of something kept to check at its two boundaries: what the page stored,
// read back, and a page opened in a fresh context with it already there.
//   const records = await storedDrafts(page);       the device's ground-truth drafts, as the page stored them
//   await seedDrafts(ctx, records);                  before the page opens: those drafts on the device
//   await seedKeys(ctx, { key: "value" });           before the page opens: those browser keys
export const storedDrafts = (page) => page.evaluate(() => new Promise((ok, bad) => {
  const q = indexedDB.open("gt-drafts", 1);
  q.onupgradeneeded = () => { q.transaction.abort(); ok([]); };
  q.onsuccess = () => { const r = q.result.transaction("drafts").objectStore("drafts").getAll(); r.onsuccess = () => { q.result.close(); ok(r.result); }; r.onerror = () => bad(r.error); };
}));

// written before any script of the page's runs, so the page's own first read of the store waits behind this write
export const seedDrafts = (ctx, records) => ctx.addInitScript((records) => {
  if (window !== window.top) return;
  const q = indexedDB.open("gt-drafts", 1);
  q.onupgradeneeded = () => q.result.createObjectStore("drafts", { keyPath: ["study", "sha256"] });
  q.onsuccess = () => {
    const t = q.result.transaction("drafts", "readwrite");
    for (const r of records) t.objectStore("drafts").put(r);
    t.oncomplete = t.onabort = () => q.result.close();
  };
}, records);

export const seedKeys = (ctx, keys) => ctx.addInitScript((keys) => {
  if (window !== window.top) return;
  for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
}, keys);
