// Study Setup (req/setup/page, req/setup/data): the page /setup?study=<id>, for those Drive lets write the study's root, online
// only. It is the shell's page (shell.js: sign-in, the store, the study's place, the viewer, the left bar) with Data Management
// (data_mode.js) attached to it, built here from what the shell lends: the study's folders, their access, previews, tags and
// descriptions, hide rules, the grouping tag, areas of interest, damaged areas, Needs GT, the extractions folder's set-up.
"use strict";
import { attach, lent } from "./shell.js";
import { dataMode } from "./data_mode.js";
import { setupMarks } from "./setup_marks.js";
import { setupBatch } from "./setup_batch.js";

const { $, views, summaryMasks, st, retitle, openBytes, minimapView } = lent;

// the marks and the batch run (req/setup/marks, req/setup/batch): their boxes, told what Data Management has chosen
const sd = lent.remote.writer(lent.account), reader = lent.place.reader;
let data;
const marked = { marked: () => data.marked() };
const marks = setupMarks({ $, reader, writer: sd, place: lent.place, data: marked });
const batch = setupBatch({ $, runner: lent.batchRunner, remote: lent.remote, account: lent.account, reader, writer: sd, place: lent.place, data: marked, status: lent.status });
const setup = {
  chose(kind, info) { marks.chose(kind, info); batch.chose(kind, info); },
  busy: () => batch.busy(),
  leave() { marks.leave(); batch.leave(); },
};

attach(data = dataMode({
  ...lent,
  setup,
  // the areas (req/shell/data/damaged, req/shell/data/area-of-interest): a lasso over the image, done(points) once drawn; the
  // image's areas, shown at once on the original open
  lasso: (done, hint) => summaryMasks.lassoFor(done, hint),
  areasOf: (id, areas) => { if (st.source?.id === id && st.source.kind !== "preview") summaryMasks.areas(areas); },
  // the folder's images in the main area, or the image
  showFolder(on) {
    $("#folder-view").hidden = !on; $("#image-view").hidden = on || views.now !== "image";
    if (!on) minimapView();
  },
  modeChanged(on) {
    retitle(); $("#tip").hidden = true;
    if (!on && views.now !== "image") views.show("image");
    minimapView();
  },
  // the drawers on show changed: their numbers again
  relabel: () => retitle(),
  openPreview: (name, bytes, source) => openBytes(name, bytes, source),
}));
