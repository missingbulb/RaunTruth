// Study Setup (req/setup/page, req/setup/aspects, req/setup/data): the page /setup?study=<id>, for those the store lets write the
// study's root, online only. It has a layout of its own, the stages across the top and a rail of the study's aspects, built here from
// what the shell lends (sign-in, the store, the study's place, the image view, which shows in a dialog): Data Management
// (data_mode.js) with the study's folders, their access, previews, tags and descriptions, hide rules, the grouping tag, areas of
// interest, damaged areas, Needs GT and the set-up of Analysis Files; the marks, the batch run, the sharing, the stage and the results.
"use strict";
import { attach, lent } from "./shell.js";
import { dataMode } from "./data_mode.js";
import { setupMarks } from "./setup_marks.js";
import { setupBatch } from "./setup_batch.js";
import { setupStage } from "./setup_stage.js";
import { setupResults } from "./setup_results.js";
import { sharingPanel } from "./setup_sharing.js";

const { $, views, summaryMasks, st, drawBoxes, openBytes, minimapView, calls, page } = lent;
const imageDialog = $("#image-dlg");

// the marks and the batch run (req/setup/marks, req/setup/batch): their boxes, told what Data Management has chosen
const sd = lent.remote.writer(lent.account), reader = lent.place.reader;
let data, stage;
const marked = { marked: () => data.marked() };
const marks = setupMarks({ $, reader, writer: sd, place: lent.place, data: marked, allows: lent.stageAllows, calls });
const batch = setupBatch({ $, runner: lent.batchRunner, remote: lent.remote, account: lent.account, reader, writer: sd, place: lent.place, data: marked, status: lent.status });
const setup = {
  chose(kind, info) { marks.chose(kind, info); batch.chose(kind, info); },
  busy: () => batch.busy(),
  // the study file's index or marks were written: what the stage box lists of them is read again
  indexed: () => stage?.stageChanged(),
  leave() { marks.leave(); batch.leave(); },
};

attach(data = dataMode({
  ...lent,
  setup,
  // the areas (req/shell/data/damaged, req/shell/data/area-of-interest): a lasso over the image, done(points) once drawn; the
  // image's areas, shown at once on the original open
  lasso: (done, hint) => summaryMasks.lassoFor(done, hint),
  areasOf: (id, areas) => { if (st.source?.id === id && st.source.kind !== "preview") summaryMasks.areas(areas); },
  // whether the grid shows; a folder chosen shuts the image's dialog
  showFolder(on) {
    $("#folder-view").hidden = !on;
    if (document.documentElement.dataset.sel !== "image") imageDialog.close();
  },
  // the image open in the image view, by its source, or null
  imageOpen: () => (page.get("image") ? st.source : null),
  modeChanged(on) {
    drawBoxes(); $("#tip").hidden = true;
    if (!on && views.now !== "image") views.show("image");
    minimapView();
  },
  // the drawers on show changed: their numbers again
  relabel: () => drawBoxes(),
  openPreview: (name, bytes, source) => openBytes(name, bytes, source),
}));

// Study Setup's sharing (req/setup/sharing-check, req/setup/people): what the study's stage needs of its sharing in the store, and who holds which
// of the three shares
const sharing = sharingPanel(lent);
attach(sharing);

// the stage (req/setup/promote): promoted and moved back here, and once it is written the page's own stage follows, so that the data and
// the marks open or close at once and the sharing is checked against what the new stage needs
stage = setupStage({ $, reader, writer: sd, place: lent.place, changed: (to) => lent.setStage(to), calls });
attach(stage);
// the results (req/setup/results): the official extractions' numbers, read on a press
attach(setupResults({ $, reader, place: lent.place, saveFile: lent.saveFile, calls }));
attach({ stageChanged() { marks.stageChanged(); sharing.recheck(); } });

// the aspects (req/setup/aspects): one chosen at a time in the rail, Images as the page opens
const aspect = $("#setup-aspect");
$("#setup-rail").onclick = (e) => {
  const b = e.target.closest("button[data-aspect]");
  if (!b) return;
  aspect.dataset.aspect = b.dataset.aspect;
  for (const x of $("#setup-rail").querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
};
// the image's dialog (req/setup/image): the image flat, over the page, which waits behind it
$("#image-open").onclick = () => {
  $("#image-dlg-title").textContent = $("#image-panel-name").textContent;
  if (!imageDialog.open) imageDialog.showModal();
  minimapView();
};
$("#image-close").onclick = () => imageDialog.close();
// Esc gives up a lasso being drawn before it shuts the dialog
let lassoed = false;
window.addEventListener("keydown", (e) => { if (e.key === "Escape") lassoed = !!imageDialog.querySelector(".lassoing"); }, true);
imageDialog.addEventListener("cancel", (e) => { if (lassoed) e.preventDefault(); lassoed = false; });
imageDialog.addEventListener("close", () => { $("#image-dlg-title").textContent = ""; });
// a notice raised while the dialog holds the page shows inside it, where it can be answered
const noticeHome = $("#notice").parentNode;
const placeNotice = () => {
  const into = imageDialog.open && !$("#notice").hidden ? imageDialog : noticeHome;
  if ($("#notice").parentNode !== into) { into.append($("#notice")); if (into === imageDialog) $("#notice-ok").focus(); }
};
new MutationObserver(placeNotice).observe($("#notice"), { attributes: true, attributeFilter: ["hidden"] });
imageDialog.addEventListener("close", placeNotice);
// the page's own layout shows to those the store lets write the root
attach({ open(on) { $("#setup").hidden = !on; if (!on) imageDialog.close(); } });
