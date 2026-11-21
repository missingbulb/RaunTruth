# The image every CI test run runs in (req/checks/ci-sets/one-image): what the tests use, fetched once here, so a
# run needs no network. Built from the context inputs.py assembles, and tagged by its hash and its ENGINE: what every
# engine's run uses comes first, shared by the three images, and the engine's own browser last.
FROM node:22-bookworm-slim AS node

FROM python:3.11-slim-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Tesseract, which the lab reads book titles with, as the page does with tesseract.js
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl fonts-dejavu-core tesseract-ocr \
 && rm -rf /var/lib/apt/lists/* \
 && git config --system --add safe.directory '*'

COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt
ENV PATH=/opt/venv/bin:$PATH

COPY . /tmp/inputs
RUN sh /tmp/inputs/dev/tools/test-image/prepare.sh /tmp/inputs && rm -rf /tmp/inputs

# the Playwright the page tests drive the browsers with; its Chromium must have what the page uses, interest invokers
# among them. Chromium's headless shell is what a headless launch runs; Firefox runs on Mesa's software EGL for its
# WebGL (web-tests/engine.mjs); WebKit draws its WebGL on a newer Mesa, Debian's own crashing its page process now and
# then as it shows the 3D view
ARG PLAYWRIGHT=1.63.0
ARG ENGINE
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
RUN test -n "$ENGINE" \
 && npm i -g "playwright@$PLAYWRIGHT" \
 && case "$ENGINE" in \
      chromium) playwright install --with-deps --only-shell chromium ;; \
      firefox) playwright install --with-deps firefox && apt-get install -y --no-install-recommends libegl1 libegl-mesa0 libgl1-mesa-dri ;; \
      webkit) playwright install --with-deps webkit \
        && echo "deb http://deb.debian.org/debian bookworm-backports main" > /etc/apt/sources.list.d/backports.list \
        && apt-get update \
        && apt-get install -y --no-install-recommends -t bookworm-backports libgl1-mesa-dri libegl-mesa0 libglx-mesa0 libgbm1 mesa-libgallium ;; \
    esac \
 && rm -rf /var/lib/apt/lists/* /root/.npm

# what the run then reaches for, from here alone: the studies' wheels for the build, the files the tests would fetch once
ENV PIP_NO_INDEX=1 PIP_FIND_LINKS=/opt/wheels TEST_DOWNLOADS=/opt/test-downloads
