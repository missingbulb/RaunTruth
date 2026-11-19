// The headers the site's _headers file adds to each address, as Cloudflare adds them: {address: {name: value}}, for a
// test's server serving the built site.
import fs from "node:fs";
import path from "node:path";

export function siteHeaders(site) {
  const file = path.join(site, "_headers"), out = {};
  for (const [, at, lines] of (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "").matchAll(/^(\/\S*)\n((?:[ \t]+.*\n?)*)/gm))
    out[at] = Object.fromEntries(lines.split("\n").filter((l) => l.trim()).map((l) => l.trim().split(/:\s*/, 2)));
  return out;
}
