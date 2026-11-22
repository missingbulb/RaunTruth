// The studies as the site publishes them, as the page tests' fake of them: each study's study.json and the list of
// studies, answered as the site serves them and changed as a test says. One for a browser's every context, which one
// context may change further for itself.
//   studies(ctx).edit(id, (m) => m);       study id's study.json as the test needs it, made from the one served; an
//                                          edit may change m in place or return another
//   studies(ctx).editList((list) => list); the list of studies, the same way
//   studies(ctx).atStage(id, "PostGT");    the study in that stage; fromThisComputer(id): it opens files from this
//                                          computer alone; rootedAt(id, folder): its own Drive folder is that one
const fakes = new WeakMap();
export const studies = (ctx) => fakes.get(ctx);

const making = (parent) => {
  const own = { edits: new Map(), list: [] };
  return {
    edit(id, fn) { own.edits.set(id, [...(own.edits.get(id) || []), fn]); },
    editList(fn) { own.list.push(fn); },
    atStage(id, stage) { this.edit(id, (m) => ({ ...m, stage })); },
    fromThisComputer(id) { this.edit(id, (m) => ({ ...m, files: { ...m.files, from: ["local"] } })); },
    rootedAt(id, folder) { this.edit(id, (m) => ({ ...m, root: `https://drive.google.com/drive/folders/${folder.id ?? folder}` })); },
    // the browser's edits, then the context's own
    editsOf: (id) => [...(parent?.editsOf(id) || []), ...(own.edits.get(id) || [])],
    listEdits: () => [...(parent?.listEdits() || []), ...own.list],
  };
};

// a browser's studies, made on first need
export const studiesIn = (world) => (world.studies ||= making(null));

const STUDY = /\/studies\/([\w-]+)\/study\.json$/, LIST = /\/web\/studies\.json$/;

export async function fakeStudies(ctx, world, outside) {
  const mine = making(studiesIn(world));
  fakes.set(ctx, mine);
  outside.route((u) => STUDY.test(u.pathname) || LIST.test(u.pathname), async (route) => {
    const p = new URL(route.request().url()).pathname, id = p.match(STUDY)?.[1];
    const edits = id ? mine.editsOf(id) : mine.listEdits();
    if (!edits.length) return route.fallback();
    try {
      // a checkout that has not built the list serves none: the edits then make it from nothing
      const served = await route.fetch();
      let m = served.ok ? await served.json() : null;
      for (const fn of edits) m = fn(m) ?? m;
      if (m == null) return await route.fulfill({ response: served });
      return await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(m) });
    } catch (e) {
      // the test closed the page or its context while the study was on its way: nobody is waiting for it
      if (!/disposed|closed|failed to find browser context/i.test(e.message)) throw e;
    }
  });
}
