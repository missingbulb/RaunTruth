// Runs the page's own Drive code (web/drive.js) under Node, with no browser, against the Drive fake holding a public
// folder, which the site's API key reaches, and a private one, which only the signed-in user's token reaches. Checks
// req/shell/drive/credentials: signed in, every Drive read carries the token and never the key, the private folder
// lists and its image downloads; signed out, reads carry the key alone and the private folder is refused; signed in
// with the token run out, no read falls back to the key. Then the half of req/shell/drive/throttle that is the read's
// own: a download failing while Drive still answers for the file's details is told as throttling, a whole download or
// a file's first bytes alike, and one failing with the details failing too is the error it is.
// The sign-in handed to the Drive code is the test's own, holding one token and renewing none: the page's renewal
// (req/shell/drive/renewal) is a browser's, tested there.
// Exits 1 on a failed check.
//   node web-tests/drive_reads_driver.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { driveUnderNode } from "./fakes/google_drive_under_node.mjs";
import { SCOPES } from "./fakes/google_sign_in.mjs";

const KEY = "stand-in-key", TOKEN = "stand-in-token";
const PUBLIC = "publicfolder00000001", PRIVATE = "privatefolder0000001", IMAGE = "privateimage00000001", OPEN = "publicimage000000001";
const BYTES = Buffer.from("not a picture, which no read here opens");

const { drive, signIn: google } = driveUnderNode({ apiKey: KEY });
const { remote } = await import(pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web", "drive.js")).href);

drive.folder({ id: PUBLIC, name: "Public folder", access: "public" });
drive.folder({ id: PRIVATE, name: "Private folder", access: "private" });
drive.file({ id: OPEN, name: "private.png", parent: PUBLIC, bytes: BYTES, mimeType: "image/png" });
drive.file({ id: IMAGE, name: "private.png", parent: PRIVATE, bytes: BYTES, mimeType: "image/png" });

let failed = 0;
const check = (ok, what, seen) => {
  if (ok) console.log("ok: " + what);
  else { failed++; console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); }
};
// the Drive code as a session has it: signed in with a token good for `left` ms more (negative: run out that long
// ago), or signed out (null); reads(): each Drive read it made since, {key, bearer}
function session(left) {
  const who = left == null ? null : google.signedIn({ token: TOKEN, scopes: SCOPES, until: Date.now() + left });
  remote.use(who && { signedIn: () => true, forRead: async () => (who.until > Date.now() ? who.token : null), refused() {} });
  const from = drive.calls.length;
  return () => drive.calls.slice(from).map((c) => ({ key: c.key, bearer: c.token }));
}
// what a read came to: its value, or the Error it failed with
const outcome = (read) => read.then((value) => ({ value }), (error) => ({ error }));
const names = (got) => got.value?.map((f) => f.name);

{
  const reads = session(3600e3);
  const listed = await outcome(remote.list(PRIVATE, ".png"));
  check(names(listed)?.includes("private.png"), "signed in, a private folder the user's account can see lists", listed.error?.message);
  const got = await outcome(remote.file(IMAGE));
  check(got.value?.bytes.byteLength === BYTES.length, "signed in, an image in the private folder downloads", got.error?.message);
  check(reads().length === 3 && reads().every((r) => r.bearer === TOKEN), "signed in, every Drive read carries the user's token", reads());
  check(reads().every((r) => r.key === null), "signed in, no Drive read carries the site's API key", reads());
}
{
  const reads = session(null);
  const pub = await outcome(remote.list(PUBLIC, ".png"));
  check(names(pub)?.includes("private.png"), "signed out, a public folder lists", pub.error?.message);
  const priv = await outcome(remote.list(PRIVATE, ".png"));
  check(/refused the folder \(404\)/.test(priv.error?.message), "signed out, a private folder is refused", priv.error?.message || names(priv));
  check(reads().length === 2 && reads().every((r) => r.key === KEY && r.bearer === null), "signed out, every Drive read carries the site's API key alone", reads());
}
{
  // the token ran out an hour ago, and nothing here renews it
  const reads = session(-3600e3);
  const got = await outcome(remote.list(PUBLIC, ".png"));
  check(/click again/.test(got.error?.message) && reads().every((r) => r.key === null), "signed in with the token run out, no read falls back to the site's API key",
    { error: got.error?.message, reads: reads() });
}
{
  session(null);
  drive.outage = "throttled";
  const whole = await outcome(remote.file(OPEN, "private.png")), first = await outcome(remote.head(OPEN, 65536));
  check(whole.error?.throttled === true, "a download failing while the file's details answer is told as throttling", whole.error?.message);
  check(first.error?.throttled === true, "and so is a read of a file's first bytes", first.error?.message);
  drive.outage = "down";
  const down = await outcome(remote.file(OPEN, "private.png"));
  check(down.error && !down.error.throttled, "one failing with the details failing too is the error it is, not throttling", down.error?.message || "it opened");
  drive.outage = null;
}

process.exit(failed ? 1 : 0);
