// A study as one loading from this computer (req/shell/load/from), for a test of the shell that opens its image with
// the computer's file chooser: its study.json served with files.from ["local"], the rest as it is.
import { studies } from "./fakes/studies.mjs";

export async function localStudy(ctx, id) {
  studies(ctx).edit(id, (m) => { m.files.from = ["local"]; });
}
