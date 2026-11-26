// GitHub's new-issue page, as the page tests' fake of it: the address the site opens for a problem report or a new
// study's request answers with a plain page showing what the site filled in, and each opening is kept.
//   githubIssues(ctx).opened      [{repo, template, title, ...the form's other fields}], oldest first
const fakes = new WeakMap();
export const githubIssues = (ctx) => fakes.get(ctx);

const esc = (t) => String(t).replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function fakeGithubIssues(ctx, world, outside) {
  const issues = { opened: [] };
  fakes.set(ctx, issues);
  outside.route(/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/new(\?|$)/, (route) => {
    const u = new URL(route.request().url()), fields = Object.fromEntries(u.searchParams);
    issues.opened.push({ repo: u.pathname.split("/").slice(1, 3).join("/"), ...fields });
    return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: `<!doctype html><title>New issue (a stand-in for GitHub)</title>
<h1>New issue: a stand-in for GitHub's form</h1><p>Signed out of GitHub: sending this would ask you to sign in.</p>
<dl>${Object.entries(fields).map(([k, v]) => `<dt>${esc(k)}</dt><dd><pre data-field="${esc(k)}">${esc(v)}</pre></dd>`).join("")}</dl>` });
  });
}
