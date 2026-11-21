"""Deletes the test images no run needs any more (req/checks/ci-sets/one-image): every version of the package older
than DAYS, but main's image, the cache tags each engine's build starts from, and what a kept image is made of. Run
nightly on main, logged in to the registry, with GITHUB_TOKEN allowed to delete the package's versions.
  python3 dev/tools/test-image/prune.py IMAGE [DAYS]      IMAGE as test-image.yml names main's, its tag without the engine"""
import datetime
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request


def doomed(versions, keep, days, now, parts):
    """The versions to delete: older than days, with no tag of main's image (keep) or a cache tag, and no part of a
    kept image (parts, their digests)."""
    old = now - datetime.timedelta(days=days)

    def kept(v):
        tags = v['metadata']['container']['tags']
        when = datetime.datetime.fromisoformat(v['updated_at'].replace('Z', '+00:00'))
        return when > old or v['name'] in parts or any(t.startswith(keep + '-') or t.startswith('cache-') for t in tags)
    return [v for v in versions if not kept(v)]


def api(method, path):
    q = urllib.request.Request('https://api.github.com' + path, method=method, headers={
        'Authorization': 'Bearer ' + os.environ['GITHUB_TOKEN'], 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(q) as r:
        body = r.read()
        return json.loads(body) if body else None


def parts_of(ref):
    """The digests an image index lists, which the registry keeps as versions of their own with no tag."""
    raw = subprocess.run(['docker', 'manifest', 'inspect', ref], capture_output=True, text=True, check=True).stdout
    return {m['digest'] for m in json.loads(raw).get('manifests', [])}


if __name__ == '__main__':
    image, days = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 14
    repo, keep = image.rsplit(':', 1)
    _, owner, package = repo.split('/', 2)
    path = f'/users/{owner}/packages/container/{urllib.parse.quote(package, safe="")}/versions'
    versions, page = [], 1
    while batch := api('GET', f'{path}?per_page=100&page={page}'):
        versions += batch
        page += 1
    kept_tags = [t for v in versions for t in v['metadata']['container']['tags'] if t.startswith(keep + '-') or t.startswith('cache-')]
    parts = set().union(*(parts_of(f'{repo}:{t}') for t in kept_tags))
    gone = doomed(versions, keep, days, datetime.datetime.now(datetime.timezone.utc), parts)
    print(f'{len(versions)} versions; keeping {len(versions) - len(gone)} ({", ".join(sorted(kept_tags))} and those newer than {days} days); deleting {len(gone)}')
    for v in gone:
        api('DELETE', f'{path}/{v["id"]}')
        print('deleted', v['name'], ' '.join(v['metadata']['container']['tags']) or '(untagged)', v['updated_at'])
