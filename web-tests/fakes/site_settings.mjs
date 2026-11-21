// The deploy's variables, as the page tests' fake of the deploy: the site's config.js as the release writes it, by the
// release's own generator, from the variables a test sets. One for a browser's every context, which one context may
// set for itself.
//   siteSettings(ctx).env = { GOOGLE_API_KEY, GOOGLE_CLIENT_ID };   the deploy's variables; unset, or with no key, the
//     committed config.js, as a deploy with no key keeps it
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILD = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "dev", "tools", "build");
const WRITE = "import json, sys; sys.path.insert(0, sys.argv[1]); import build; print(build.config_js(json.loads(sys.argv[2])) or '', end='')";

// the release's config.js for each set of variables, written once
const written = new Map();
const configJs = (env) => {
  const key = JSON.stringify(env);
  if (!written.has(key)) written.set(key, execFileSync("python3", ["-c", WRITE, BUILD, key]).toString());
  return written.get(key);
};

const fakes = new WeakMap();
export const siteSettings = (ctx) => fakes.get(ctx);

// a browser's deploy, made on first need
export const settingsIn = (world) => (world.settings ||= { env: null });

export async function fakeSiteSettings(ctx, world, outside) {
  // the context's own, reading the browser's until it sets its own
  const settings = Object.create(settingsIn(world));
  fakes.set(ctx, settings);
  outside.route("**/web/config.js", (route) => {
    const body = settings.env && configJs(settings.env);
    return body ? route.fulfill({ status: 200, contentType: "text/javascript", body }) : route.fallback();
  });
}
