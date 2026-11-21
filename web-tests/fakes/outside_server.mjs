// Where a context's fakes answer from: a server on this machine the context's browser reaches as its proxy, so every
// request of the context comes here on the browser's own network, with its cache, and none is held up in Playwright
// (a route on a context has each request of each of its pages answered through the driver, with the cache off). A
// fake takes the addresses it answers with route(), as it would on a context, and is handed the same kind of route;
// an address no fake takes goes on to the site's own server when it is on this machine, and is turned away when it
// is not.
//   const outside = await outsideServer({ left: (href) => {}, cutAs: (href, name) => {} });   left: told each request
//                                       turned away; cutAs: each one a fake failed or that came while offline (then,
//                                       maybe only the https host it was for), with the failure it stands for
//   outside.route(match, handler);      match: a URL's own text with * and **, a RegExp, or (url) => bool; a route
//                                       set later is asked first, and its fallback() asks the next
//   outside.contextOptions              what the context is opened with to reach it
//   outside.offline = true;             nothing answers, as with no network: what the browser's own offline lets
//                                       through (Chromium's, a request's preflight) is cut
//   outside.close();
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";

// an address off this machine
export const offSite = (u) => /^https?:/.test(u.href) && !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(u.href);
// the site's own addresses a fake answers
export const FAKED = /^\/(web\/config\.js|web\/studies\.json|studies\/[\w-]+\/study\.json)$/;

// The certificate the server shows for every https host it stands in for, made once per machine: the browser is told
// to take it (contextOptions), since no authority signed it.
let made = null;
function certificate() {
  if (made) return made;
  const dir = path.join(os.tmpdir(), `page-tests-outside-${os.userInfo().uid}`);
  const read = () => ({ key: fs.readFileSync(path.join(dir, "key.pem")), cert: fs.readFileSync(path.join(dir, "cert.pem")) });
  try { return (made = read()); } catch { /* not made yet */ }
  const fresh = fs.mkdtempSync(dir + "-");
  execFileSync("openssl", ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes", "-days", "3650",
    "-subj", "/CN=page tests", "-keyout", path.join(fresh, "key.pem"), "-out", path.join(fresh, "cert.pem")], { stdio: "ignore" });
  // another test's process may have made it meanwhile: its own stays
  try { fs.renameSync(fresh, dir); } catch { fs.rmSync(fresh, { recursive: true, force: true }); }
  return (made = read());
}

const matcher = (m) => typeof m === "function" ? m : m instanceof RegExp ? (u) => m.test(u.href)
  : ((re) => (u) => re.test(u.href))(new RegExp("^" + m.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*") + "$"));

const bodyOf = (q) => new Promise((ok, no) => { const parts = []; q.on("data", (d) => parts.push(d)).on("end", () => ok(Buffer.concat(parts))).on("error", no); });

// headers that are one connection's own, never passed on
const HOP = new Set(["connection", "proxy-connection", "keep-alive", "transfer-encoding", "upgrade", "proxy-authorization"]);
const passed = (headers) => Object.fromEntries(Object.entries(headers).filter(([k]) => !HOP.has(k.toLowerCase())));

export async function outsideServer({ left = () => {}, cutAs = () => {} } = {}) {
  const routes = [], sockets = new Set();
  const outside = {
    offline: false,
    route(match, handler) { routes.unshift({ match: matcher(match), handler }); },
    close() { server.close(); for (const s of sockets) s.destroy(); },
  };

  // the site's own answer to a request, read whole
  const fromSite = (href, method, headers, body) => new Promise((ok, no) => {
    const up = http.request(href, { method, headers: passed(headers) }, async (res) => {
      try { ok({ status: res.statusCode, headers: res.headers, body: await bodyOf(res) }); } catch (e) { no(e); }
    });
    up.on("error", no);
    up.end(body);
  });

  async function answer(q, r, href) {
    const cut = () => { q.socket.destroy(); };
    if (outside.offline) { cutAs(href, "ERR_INTERNET_DISCONNECTED"); return cut(); }
    const url = new URL(href), body = await bodyOf(q);
    const send = (status, headers, content) => {
      if (r.headersSent || r.destroyed) return;
      r.writeHead(status, { ...passed(headers), "content-length": Buffer.byteLength(content) });
      r.end(q.method === "HEAD" ? undefined : content);
    };
    const request = {
      url: () => href, method: () => q.method, headers: () => q.headers,
      postDataBuffer: () => (body.length ? body : null), postData: () => (body.length ? body.toString("utf8") : null),
    };
    let at = 0;
    const route = {
      request: () => request,
      abort() { cutAs(href, "ERR_FAILED"); cut(); },
      async fulfill({ status = 200, headers = {}, contentType, body: content = "", path: file, response } = {}) {
        if (response) return send(response.status, response.headers, response.body);
        const all = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
        if (contentType) all["content-type"] = contentType;
        // a fake's answer is made anew for each request, whatever the browser kept of the last
        all["cache-control"] ||= "no-store";
        send(status, all, file ? fs.readFileSync(file) : content);
      },
      async fetch() {
        const got = await fromSite(href, q.method, q.headers, body);
        return { ...got, ok: got.status >= 200 && got.status < 300, json: async () => JSON.parse(got.body.toString("utf8")) };
      },
      async fallback() {
        while (at < routes.length) { const { match, handler } = routes[at++]; if (match(url)) return handler(route); }
        if (offSite(url)) { left(href); return cut(); }
        // the site's own server, its answer passed on as it comes
        const up = http.request(href, { method: q.method, headers: passed(q.headers) }, (res) => {
          const headers = passed(res.headers);
          // an address a fake answers when a test says so: asked anew each time, so that it can
          if (FAKED.test(url.pathname)) headers["cache-control"] = "no-store";
          r.writeHead(res.statusCode, headers);
          res.pipe(r);
          res.on("error", cut);
        });
        up.on("error", cut);
        r.on("close", () => up.destroy());
        up.end(body);
      },
    };
    await route.fallback();
  }

  const serve = (hrefOf) => (q, r) => {
    const href = hrefOf(q);
    q.on("error", () => {}); r.on("error", () => {});
    answer(q, r, href).catch((e) => {
      console.error(`the outside server failed on ${q.method} ${href}: ${e?.stack || e}`);
      process.exitCode = 1;
      q.socket.destroy();
    });
  };
  const kept = (socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); socket.on("error", () => {}); };

  // what comes through a tunnel to an https host: the server stands in for the host, whichever it is
  const secure = http.createServer(serve((q) => `https://${q.headers.host}${q.url}`));
  const server = http.createServer(serve((q) => q.url));
  server.on("connection", kept);
  server.on("connect", (q, socket, head) => {
    socket.on("error", () => {});
    if (outside.offline) { cutAs("https://" + q.url.replace(/:443$/, ""), "ERR_INTERNET_DISCONNECTED"); return socket.destroy(); }
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head?.length) socket.unshift(head);
    const within = new tls.TLSSocket(socket, { isServer: true, ...certificate(), ALPNProtocols: ["http/1.1"] });
    within.on("error", () => {});
    secure.emit("connection", within);
  });
  for (const s of [server, secure]) s.on("clientError", (e, socket) => socket.destroy());
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  // the run ends when its test does, whichever contexts it left open
  server.unref();
  outside.contextOptions = { proxy: { server: `http://127.0.0.1:${server.address().port}` }, ignoreHTTPSErrors: true };
  return outside;
}
