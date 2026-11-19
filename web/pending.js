// The page's own work still under way: the store's calls, Python's calls, and the operations that chain them (a study
// coming in, an image opening, its folders listed, a tags file saved). Whoever must know the page is idle (its tests)
// reads `work` rather than guessing from a quiet spell. Work the person is in the middle of (a dialog, the store's folder picker)
// is not counted: the page is idle while it waits for them.
const now = new Map(); // what is under way: its name, by a key of its own
let started = 0;
export const work = {
  // a piece of work begun now, under a name saying what it is, counted until the function returned is called
  begin(what) {
    const key = ++started;
    now.set(key, what);
    return () => { now.delete(key); };
  },
  // what promise settles to, counted until it does
  during(promise, what) {
    const end = work.begin(what);
    return Promise.resolve(promise).finally(end);
  },
  // fn, its every call counted while the promise it returns is pending
  counting(what, fn) { return (...a) => work.during(fn(...a), what); },
  // obj with each of the named methods counted while the promise it returns is pending
  counted(obj, names, what) {
    for (const k of names) { const f = obj[k]; obj[k] = (...a) => work.during(f(...a), `${what} ${k}`); }
    return obj;
  },
  // how much is under way, and what; how much has begun since the page loaded
  get pending() { return now.size; },
  get doing() { return [...now.values()]; },
  get started() { return started; },
};
