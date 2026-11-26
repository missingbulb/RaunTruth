// The study's steps as the page holds them (req/shell/steps): those done, then the one to do now marked *, as
// "Load image › Count*"; the later ones are left out.
export const stepsOf = (page) => page.evaluate(() => {
  const all = shellForTests.steps, now = all.findIndex((p) => !p.done);
  return (now < 0 ? all : all.slice(0, now + 1)).map((p, k) => p.name + (k === now ? "*" : "")).join(" › ");
});
