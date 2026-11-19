// A page test working as a Ground Truth Tagger (req/shell/account/role), which only someone signed in may be: the site
// served with a stand-in Google client, a user signed in to the sign-in fake with a token for the hour, the welcome
// popup answered, and the role chosen, with no settings saved to Drive yet. Each study's folder on the Drive fake holds
// a submissions folder the user may add to alone, which is what makes them a tagger (req/shell/data/roles).
// apiKey turns on loading from Drive with the site's key.
import { googleDrive } from "./fakes/google_drive.mjs";
import { signIn } from "./fakes/google_sign_in.mjs";

export const TAGGER = "tagger@acme.example";

export async function asTagger(ctx, { apiKey = "" } = {}) {
  const drive = googleDrive(ctx);
  for (const root of drive.files.filter((f) => f.folder && !f.parent)) {
    const subs = drive.files.find((f) => f.parent === root.id && f.name === "GT submissions") || drive.folder({ name: "GT submissions", parent: root.id });
    drive.writers.set(subs.id, new Set([TAGGER]));
  }
  // each visit a tagger whose Drive holds no settings of the site's yet, whatever an earlier visit saved
  const google = signIn(ctx);
  google.settings.splice(0, google.settings.length, ...google.settings.filter((f) => f.owner !== TAGGER));
  const record = google.signedIn({ email: TAGGER, name: "Acme Tagger" });
  const config = { apiKey, clientId: "acme-tagger.apps.googleusercontent.com" };
  await ctx.route("**/web/config.js", (r) => r.fulfill({ contentType: "text/javascript",
    body: `window.NOR_CONFIG = { google: ${JSON.stringify(config)} };` }));
  // the sign-in seeded once a device, so a page opened later keeps what the page wrote of it since
  await ctx.addInitScript((record) => {
    if (!localStorage.getItem("nor-google-sign-in")) localStorage.setItem("nor-google-sign-in", JSON.stringify(record));
    localStorage.setItem("nor-welcome", JSON.stringify({ choice: "google", remember: true }));
    localStorage.setItem("nor-role", "tagger");
  }, record);
}
