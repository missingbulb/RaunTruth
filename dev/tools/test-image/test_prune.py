"""req/checks/ci-sets/one-image: the nightly run deletes the test images no run needs any more, and keeps main's,
the cache tags', anything newer than the days kept, and what a kept image is made of."""
import datetime

import prune

NOW = datetime.datetime(2026, 12, 1, tzinfo=datetime.timezone.utc)


def version(id, days_old, *tags, digest=None):
    at = (NOW - datetime.timedelta(days=days_old)).isoformat().replace('+00:00', 'Z')
    return {'id': id, 'name': digest or f'sha256:{id}', 'updated_at': at, 'metadata': {'container': {'tags': list(tags)}}}


def test_only_old_images_no_run_needs_are_deleted():
    versions = [
        version(1, 30, 'aaaa-chromium'),            # an old image of another tag: deleted
        version(2, 30, 'main1-chromium'),           # main's image, however old: kept
        version(3, 30, 'cache-webkit'),             # a cache tag: kept
        version(4, 3, 'bbbb-firefox'),              # newer than the days kept (a PR's, perhaps): kept
        version(5, 30),                             # untagged and old: deleted
        version(6, 30, digest='sha256:part'),       # untagged, but part of main's image: kept
    ]
    doomed = prune.doomed(versions, keep='main1', days=14, now=NOW, parts={'sha256:part'})
    assert [v['id'] for v in doomed] == [1, 5]
