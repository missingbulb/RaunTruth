# The one image every CI test run runs in (req/checks/ci-sets/one-image): what the tests use, fetched once here, so a
# run needs no network. Built from the context inputs.py assembles, and tagged by its hash.
FROM node:22-bookworm-slim AS node

FROM python:3.11-slim-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# the Playwright the page tests drive the browsers with; its Chromium must have what the page uses, interest invokers among them
ARG PLAYWRIGHT=1.63.0
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
# Mesa's software EGL, which the page tests launch Firefox on for its WebGL (web-tests/engine.mjs); Tesseract, which
# the lab reads book titles with, as the page does with tesseract.js
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl fonts-dejavu-core tesseract-ocr libegl1 libegl-mesa0 libgl1-mesa-dri \
 && npm i -g "playwright@$PLAYWRIGHT" \
 && playwright install --with-deps chromium firefox webkit \
 && rm -rf /var/lib/apt/lists/* /root/.npm \
 && git config --system --add safe.directory '*'

COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt
ENV PATH=/opt/venv/bin:$PATH

COPY . /tmp/inputs
RUN sh /tmp/inputs/dev/test-image/prepare.sh /tmp/inputs && rm -rf /tmp/inputs

# what the run then reaches for, from here alone: the studies' wheels for the build, the files the tests would fetch once
ENV PIP_NO_INDEX=1 PIP_FIND_LINKS=/opt/wheels TEST_DOWNLOADS=/opt/test-downloads
