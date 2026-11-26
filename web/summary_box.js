// The Summary box of the left bar (req/shell/summary/mask, req/shell/summary/download): the summary's mask, lassoed on the image, and
// Download Summary on the box's header, and whether the box shows its summary, which the mask is drawn by. It needs of the shell the
// study and the image on show, the viewer, whether a box waits, the settings' storage and what saves a file.
"use strict";
import { summaryDownload } from "./summary_download.js";
import { summaryMask } from "./summary_mask.js";

export function summaryBox(shell) {
  const { $, st, page, waits, saveFile, drag, readJSON, writeJSON, views } = shell;
  // whether the Summary box shows its summary, and whether it did when the mask was last drawn
  const summaryShows = () => !$("#summary-box").hidden && !waits($("#summary-box"));
  let summaryShown = false;
  // Download Summary on the Summary box's header: the study's summary, saved as the shell's one CSV
  const summaryCsv = summaryDownload({ button: $("#summary-dl"), saveFile, image: () => st.fileName, study: () => shell.manifest?.title });
  // the summary's mask (req/shell/summary/mask): lassoed on the image, kept per study and image, read by the study
  const summaryMasks = summaryMask({ $, viewer: () => shell.view, image: () => page.get("image"), fileName: () => st.fileName, study: () => shell.manifest,
    shows: () => summaryShows(), drag, readJSON, writeJSON, views });
  // the mask drawn again: where the box began or stopped showing its summary, and whatever it showed
  const summaryFollows = () => { if (summaryShown !== summaryShows()) { summaryShown = summaryShows(); summaryMasks.redraw(); } };
  const summaryRedrawn = () => { summaryShown = summaryShows(); summaryMasks.redraw(); };
  return { summaryCsv, summaryMasks, summaryFollows, summaryRedrawn };
}
