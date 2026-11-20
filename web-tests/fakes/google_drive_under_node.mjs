// Google Drive under Node, for a test of the page's own Drive code with no browser: the same fake the page tests'
// browser has (google_drive.mjs), answering Node's fetch of the Drive API as it answers a browser's, and the deploy's
// Google key where the page reads it. Imported, and called, before the page's modules.
//   const { drive, signIn } = driveUnderNode({ apiKey });   the Drive and the sign-in fakes' own, with their knobs
import { API, driveAnswers, driveIn } from "./google_drive.mjs";
import { signInIn } from "./google_sign_in.mjs";

export function driveUnderNode({ apiKey = "" } = {}) {
  const world = {}, drive = driveIn(world), signIn = signInIn(world), respond = driveAnswers(drive, signIn);
  // the deploy's variables, as its config.js gives them to the page
  globalThis.window = { ...globalThis.window, NOR_CONFIG: { google: { apiKey } } };
  const fetched = globalThis.fetch;
  globalThis.fetch = async (u, init = {}) => {
    const href = String(u?.url ?? u);
    if (!API.test(href)) return fetched(u, init);
    init.signal?.throwIfAborted();
    const body = init.body == null ? null : Buffer.from(typeof init.body === "string" ? init.body : new Uint8Array(init.body));
    const answer = await respond({ method: init.method || "GET", url: href, headers: Object.fromEntries(new Headers(init.headers)), body });
    // a request that fails rejects as a browser's fetch does
    if (!answer) throw new TypeError("Failed to fetch");
    return new Response(answer.status === 204 ? null : answer.body,
      { status: answer.status, headers: { ...answer.headers, ...(answer.contentType ? { "content-type": answer.contentType } : {}) } });
  };
  return { drive, signIn };
}
