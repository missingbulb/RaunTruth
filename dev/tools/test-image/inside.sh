#!/bin/sh
# In the test image, on the repo mounted at the working directory (run.sh mounts it): the test set on an engine,
# chromium when none is named, with the page's libraries the image holds in place where the page tests read them.
set -e
[ -e web-tests/node_modules ] || ln -s /opt/page-libraries/node_modules web-tests/node_modules
case "${1:-chromium}" in
  chromium) exec python3 -m pytest web-tests studies lab dev/tools/trick_pool dev/tools/test-image -q -n auto --dist worksteal --durations=10 ;;
  *) exec python3 dev/tools/build/other_engines.py "$1" ;;
esac
