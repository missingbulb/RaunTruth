// The Playwright engine the page tests drive: the one PW_ENGINE names, Chromium when it names none
// (req/checks/other-engines).
export const ENGINE = process.env.PW_ENGINE || "chromium";

// How each driver launches it. Headless Firefox on Linux makes no WebGL context until it is pointed at
// Mesa's software EGL in its own process; a person's Firefox has WebGL2, so the 3D view is tested there too.
export const LAUNCH = ENGINE === "firefox"
  ? { firefoxUserPrefs: { "webgl.force-enabled": true, "webgl.out-of-process": false }, env: { ...process.env, MOZ_WEBGL_FORCE_EGL: "1" } }
  : {};

// A context for a test of the 3D view: with no GPU the browser draws each of its frames in software, pixel by
// pixel, and at half the pixels to a CSS pixel a frame is a quarter of that work, the page laid out as it was.
//   const ctx = await browser.newContext({ viewport, ...SOFTWARE_3D });
export const SOFTWARE_3D = { deviceScaleFactor: 0.5 };
