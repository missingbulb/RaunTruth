// The systems the page reaches beyond its own code, each faked once, for every page test's browser context
// (harness.mjs), on the context's outside server (outside_server.mjs): the CDN, Google's sign-in and Drive, the
// deploy's variables and the studies the site publishes. In this order: a fake set later answers first, so the
// sign-in's app folder is asked before the rest of Drive. A new one is the owner's call (nor-finder's
// fakes-for-outside-systems).
import { fakeCdn } from "./cdn.mjs";
import { fakeGoogleDrive } from "./google_drive.mjs";
import { fakeGoogleSignIn } from "./google_sign_in.mjs";
import { fakeSiteSettings } from "./site_settings.mjs";
import { fakeStudies } from "./studies.mjs";

export const FAKES = [fakeCdn, fakeGoogleDrive, fakeGoogleSignIn, fakeSiteSettings, fakeStudies];
