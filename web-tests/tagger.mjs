// A page test working as a Ground Truth Tagger (req/shell/account/role), which only someone signed in may be: the site
// deployed with a stand-in Google key and client, a user signed in with a token for the hour, the welcome popup
// answered, and the role chosen, with no settings saved to Drive yet. Each study's folder holds a submissions folder
// the user may add to, which is what makes them a tagger (req/shell/data/roles). scopes: what the tagger's token may
// do, in place of all the site asks.
import { SCOPES } from "./fakes/google_sign_in.mjs";
import { siteSettings } from "./fakes/site_settings.mjs";
import { world } from "./world.mjs";

export const TAGGER = "tagger@acme.example";

export async function asTagger(ctx, { scopes } = {}) {
  const w = world(ctx.browser());
  // each visit a tagger whose Drive holds no settings of the site's yet, whatever an earlier visit saved
  const tagger = w.user(TAGGER).named("Acme Tagger").savedSettings(null).tags();
  if (scopes) tagger.without(...SCOPES.split(" ").filter((s) => !scopes.split(" ").includes(s)));
  siteSettings(ctx).withGoogle();
  await w.device().on(ctx).signedInAs(tagger).asRole("tagger").context();
}
