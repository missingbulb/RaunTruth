// Google's sign-in, as the page tests' fake of it, one for a browser's every context: the sign-in script's token
// client, the account's details, and the settings file the page keeps in the user's Drive app folder. It owns the tokens: one it issued or a test registered
// is live until it runs out or is revoked, and the Drive fake asks it whose a token is.
//   const google = signIn(ctx);
//   google.answer = "grant" | "deny" | "blocked" | "closed";   what Google's window says next
//   google.answerAfter = () => promise;                        Google's window answering once it settles, not at once
//   google.withhold = [scope];                                 scopes Google leaves out of the token, their boxes unticked
//   google.nextToken = "renewed-token";                        the token it grants next, a fresh one if unset
//   google.hold = (write) => promise;                          a write to the app folder answered once it settles
//   const record = google.signedIn({ email, name, scopes, token, until });   a token made live, and the page's own
//     record of a sign-in (its nor-google-sign-in key) to seed
//   google.asked, google.scriptLoads, google.calls, google.settings   what the page asked for ("METHOD url" for each
//     call), and the app folders' files ({id, owner, name, parents, body}, a test may change one's body)
//   google.next()                                              resolves at the page's next call to Google's APIs
//   google.revokeAll();                                        every token so far refused from now on
const GSI = "https://accounts.google.com/gsi/client";
const USER_INFO = "https://openidconnect.googleapis.com/v1/userinfo";
const APP = "appDataFolder";
export const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, range",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE" };
export const SCOPES = "openid email profile https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file";

// when a token issued now runs out, as Google's do
const anHourOn = () => Date.now() + 3599e3;

const fakes = new WeakMap();
export const signIn = (ctx) => fakes.get(ctx);

// whose a live token is, {email, scopes}, or null: for the Drive fake
export const holder = (ctx, token) => {
  const t = fakes.get(ctx)?.tokens.get(token);
  return t && !t.revoked && t.until > Date.now() ? t : null;
};

// a request's bearer token, or null
export const bearer = (req) => (req.headers().authorization || "").match(/^Bearer (.+)$/)?.[1] ?? null;
export const json = (route, status, body, headers = {}) =>
  route.fulfill({ status, headers: { ...CORS, ...headers }, contentType: "application/json", body: JSON.stringify(body) });

// a multipart body's parts: the metadata and the file's bytes
export function multipart(req) {
  const body = req.postDataBuffer(), boundary = "--" + req.headers()["content-type"].match(/boundary=(.+)$/)[1];
  const parts = [];
  for (let at = body.indexOf(boundary); at >= 0; ) {
    const end = body.indexOf(boundary, at + boundary.length);
    if (end < 0) break;
    const part = body.subarray(at + boundary.length, end), head = part.indexOf("\r\n\r\n");
    parts.push(part.subarray(head + 4, part.length - 2));
    at = end;
  }
  return { metadata: JSON.parse(parts[0].toString()), bytes: Buffer.from(parts[1] || []) };
}

// the script the page loads: initTokenClient's client asks this fake what Google's window answers, and keeps in the
// page, as window.tokenClient, what it was made with and asked
const SCRIPT = `(() => {
  const g = (window.google ||= {});
  g.accounts = { oauth2: { initTokenClient(o) {
    window.tokenClient = { client: o.client_id, scope: o.scope, asked: [] };
    return { requestAccessToken(opts) {
      window.tokenClient.asked.push(opts || {});
      window.__fakeSignIn({ client: o.client_id, scope: (opts && opts.scope) || o.scope, prompt: opts && opts.prompt, login_hint: opts && opts.login_hint })
        .then((a) => a.error_type ? o.error_callback && o.error_callback({ type: a.error_type }) : o.callback(a));
    } };
  } } };
})();`;

function makeSignIn() {
  let n = 0;
  const google = {
    account: { sub: "1001", name: "Ada Lovelace", email: "ada@acme.example", picture: null },
    answer: "grant", answerAfter: () => null, withhold: [], nextToken: null, hold: () => null,
    asked: [], scriptLoads: 0, calls: [],
    // the app folders' files, each user's own: {id, owner, name, parents, body}
    settings: [], waiting: [],
    next: () => new Promise((ok) => google.waiting.push(ok)),
    heard(call) { google.calls.push(call); for (const ok of google.waiting.splice(0)) ok(call); },
    tokens: new Map(),
    issue: () => `fake-token-${++n}`,
    signedIn({ email = google.account.email, name = google.account.name, scopes = SCOPES, token = google.issue(), until = anHourOn() } = {}) {
      google.tokens.set(token, { email, scopes, until });
      return { user: { name, email, picture: null }, token, until, scopes };
    },
    revokeAll() { for (const t of google.tokens.values()) t.revoked = true; },
  };
  return google;
}

// a browser's sign-in, made on first need
export const signInIn = (world) => (world.signIn ||= makeSignIn());

export async function fakeGoogleSignIn(ctx, world) {
  const google = signInIn(world);
  fakes.set(ctx, google);
  await ctx.exposeBinding("__fakeSignIn", async (_, ask) => {
    google.asked.push(ask);
    await google.answerAfter();
    const errors = { deny: { error: "access_denied" }, blocked: { error_type: "popup_failed_to_open" }, closed: { error_type: "popup_closed" } };
    if (errors[google.answer]) return errors[google.answer];
    const token = google.nextToken || google.issue();
    const scope = (ask.scope || "").split(" ").filter((s) => !google.withhold.includes(s)).join(" ");
    google.tokens.set(token, { email: google.account.email, scopes: scope, until: anHourOn() });
    return { access_token: token, expires_in: 3599, scope };
  });
  await ctx.route(GSI, (route) => { google.scriptLoads++; return route.fulfill({ status: 200, contentType: "text/javascript", body: SCRIPT }); });
  await ctx.route(USER_INFO, (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    google.heard(`GET ${route.request().url()}`);
    const who = holder(ctx, bearer(route.request()));
    return who ? json(route, 200, { ...google.account, email: who.email }) : json(route, 401, { error: { code: 401, message: "Invalid Credentials" } });
  });
  // the app folder, on the Drive API's own address: every other request there is the Drive fake's
  await ctx.route((u) => /^https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\/files/.test(u.href), async (route) => {
    const req = route.request(), u = new URL(req.url()), method = req.method();
    const id = decodeURIComponent(u.pathname.match(/\/files\/([^/]+)$/)?.[1] || "");
    const who = holder(ctx, bearer(req));
    const file = google.settings.find((f) => f.id === id && (!who || f.owner === who.email));
    const app = u.searchParams.get("spaces") === APP || file
      || (method === "POST" && u.pathname.startsWith("/upload/") && multipart(req).metadata.parents?.includes(APP));
    if (!app) return route.fallback();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    google.heard(`${method} ${req.url()}`);
    if (!who) return json(route, 401, { error: { code: 401, message: "Invalid Credentials" } });
    if (method === "POST" || method === "PATCH") await google.hold({ method });
    if (!id && method === "GET") {
      const name = (u.searchParams.get("q") || "").match(/name\s*=\s*'([^']+)'/)?.[1];
      return json(route, 200, { files: google.settings.filter((f) => f.owner === who.email && (!name || f.name === name)).map((f) => ({ id: f.id, name: f.name })) });
    }
    if (method === "POST") {
      const { metadata, bytes } = multipart(req);
      const f = { id: `appdatafile${String(google.settings.length + 1).padStart(8, "0")}`, owner: who.email, name: metadata.name, parents: metadata.parents, body: bytes.toString("utf8") };
      google.settings.push(f);
      return json(route, 200, { id: f.id });
    }
    if (method === "PATCH") { file.body = req.postData() || ""; return json(route, 200, { id: file.id }); }
    if (u.searchParams.get("alt") === "media") return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: file.body });
    return json(route, 200, { id: file.id, name: file.name });
  });
}
