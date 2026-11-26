// A page test working as someone who may save ground truth to the study (req/shell/annotate/no-save), which only
// someone signed in may: the site deployed with a stand-in Google key and client, a user signed in with a token for
// the hour, the welcome popup answered, with no settings saved to Drive yet. Each study's folder holds an Extractions
// folder the user may add to, which is what lets them save (req/shell/data/roles). scopes: what the token may do, in
// place of all the site asks.
import { SCOPES } from "./fakes/google_sign_in.mjs";
import { siteSettings } from "./fakes/site_settings.mjs";
import { world } from "./world.mjs";

export const TAGGER = "tagger@acme.example";

// the tagger, as a user of the world w; each visit one whose Drive holds no settings of the site's yet, whatever an
// earlier visit saved
export const tagger = (w) => w.user(TAGGER).named("Acme Tagger").savedSettings(null).annotates();

export async function asTagger(ctx, { scopes } = {}) {
  const w = world(ctx.browser()), t = tagger(w);
  if (scopes) t.without(...SCOPES.split(" ").filter((s) => !scopes.split(" ").includes(s)));
  siteSettings(ctx).withGoogle();
  await w.device().on(ctx).signedInAs(t).context();
}
