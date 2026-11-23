// A page test working as someone who may save ground truth to the study (req/shell/annotate/no-save), which only someone signed in
// may: the site deployed with a stand-in Google key and client, a user signed in to the sign-in fake with a token for the hour,
// the welcome popup answered, with no settings saved to Drive yet. Each study's folder on the Drive fake holds an Extractions
// folder the user may add to alone, which is what lets them save (req/shell/data/roles). scopes: what the token may do, in
// place of the sign-in fake's.
import { googleDrive } from "./fakes/google_drive.mjs";
import { signIn } from "./fakes/google_sign_in.mjs";
import { siteSettings } from "./fakes/site_settings.mjs";

export const TAGGER = "tagger@acme.example";

export async function asTagger(ctx, { scopes } = {}) {
  const drive = googleDrive(ctx);
  for (const root of drive.files.filter((f) => f.folder && !f.parent)) {
    const subs = drive.files.find((f) => f.parent === root.id && f.name === "Extractions") || drive.folder({ name: "Extractions", parent: root.id });
    drive.writers.set(subs.id, new Set([TAGGER]));
  }
  // each visit a tagger whose Drive holds no settings of the site's yet, whatever an earlier visit saved
  const google = signIn(ctx);
  google.settings.splice(0, google.settings.length, ...google.settings.filter((f) => f.owner !== TAGGER));
  const record = google.signedIn({ email: TAGGER, name: "Acme Tagger", ...(scopes ? { scopes } : {}) });
  siteSettings(ctx).env = { GOOGLE_API_KEY: "stand-in", GOOGLE_CLIENT_ID: "acme-tagger.apps.googleusercontent.com" };
  // the sign-in seeded once a device, so a page opened later keeps what the page wrote of it since
  await ctx.addInitScript((record) => {
    if (!localStorage.getItem("nor-google-sign-in")) localStorage.setItem("nor-google-sign-in", JSON.stringify(record));
    localStorage.setItem("nor-welcome", JSON.stringify({ choice: "google", remember: true }));
  }, record);
}
