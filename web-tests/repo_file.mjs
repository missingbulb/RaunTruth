// What a test's server sends for a path into the repo: a study's address (/web/<id>, or /web/ for the
// default study) is the page, as the build publishes it under each listed study's id; a file at the top that the repo
// keeps elsewhere is what the site serves there (site/'s own, or the analytics loader the build tree commits); anything
// else is the repo's own file.
import fs from "node:fs";
import path from "node:path";

export function repoFile(repo, u) {
  const id = /^\/web\/([\w-]*)$/.exec(u)?.[1];
  if (id === "" || (id && fs.existsSync(path.join(repo, "studies", id, "study.json")))) return path.join(repo, "web", "index.html");
  const top = /^\/[^/]+$/.test(u) && !fs.existsSync(path.join(repo, u))
    && [path.join(repo, "site", u), path.join(repo, "dev", "build", "site", u)].find((f) => fs.existsSync(f));
  return top || path.join(repo, u);
}

