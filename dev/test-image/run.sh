#!/bin/sh
# Runs the test set in the test image, on this checkout, on an engine (chromium when none is named), as CI does:
#   sh dev/test-image/run.sh IMAGE [firefox|webkit]
# The container's network is an internal one, with no way off this machine: a test that downloads anything fails, and
# a browser still sees a network there, as a person's does, where none at all would make it say it is offline.
set -e
image=$1; shift
docker network inspect rauntruth-tests > /dev/null 2>&1 || docker network create --internal rauntruth-tests > /dev/null
exec docker run --rm --network rauntruth-tests -e CI=true -v "$PWD:/repo" -w /repo "$image" sh dev/test-image/inside.sh "$@"
