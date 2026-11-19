// The outside systems the page reaches, each faked once, in every page test's browser context (harness.mjs), in this
// order: a fake set later answers first, so the sign-in's app folder is asked before the rest of Drive. A new one is
// the owner's call (nor-finder's fakes-for-outside-systems).
import { fakeCdn } from "./cdn.mjs";
import { fakeGoogleDrive } from "./google_drive.mjs";
import { fakeGoogleSignIn } from "./google_sign_in.mjs";

export const FAKES = [fakeCdn, fakeGoogleDrive, fakeGoogleSignIn];
