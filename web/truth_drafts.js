// A tagger's drafts of their ground truth, kept on this device in IndexedDB (req/shell/ground-truth/save-draft): one record
// per study and image SHA-256, {study, sha256, name, saved, log, model, replay}, `log` the packed active GT actions and
// `model` the study's document of the model. Every method rejects when the browser's storage fails, for the caller to say.
"use strict";

export const DRAFTS = "gt-drafts"; // the IndexedDB database of those records

export function truthDrafts() {
  const through = (mode, act) => new Promise((ok, bad) => {
    let q;
    try { q = indexedDB.open(DRAFTS, 1); } catch (e) { return bad(e); }
    q.onupgradeneeded = () => q.result.createObjectStore("drafts", { keyPath: ["study", "sha256"] });
    q.onerror = () => bad(q.error);
    q.onsuccess = () => {
      const db = q.result;
      try {
        const t = db.transaction("drafts", mode), r = act(t.objectStore("drafts"));
        t.oncomplete = () => { db.close(); ok(r?.result); };
        t.onerror = t.onabort = () => { db.close(); bad(t.error); };
      } catch (e) { db.close(); bad(e); }
    };
  });
  return {
    get: (study, sha256) => through("readonly", (s) => s.get([study, sha256])).then((r) => r ?? null),
    put: (record) => through("readwrite", (s) => s.put(record)),
    delete: (study, sha256) => through("readwrite", (s) => s.delete([study, sha256])),
    all: () => through("readonly", (s) => s.getAll()).then((r) => r ?? []),
  };
}
