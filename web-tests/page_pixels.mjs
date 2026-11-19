// The pixels a test reads of a 2D canvas the page draws, from a fresh copy each time: a canvas read again and again is
// what the browser warns of (req/checks/clean-console).
//   page.evaluate(() => testCopy(document.querySelector("#base")).getImageData(x, y, 1, 1))

// the copy's maker, in every page the harness opens
export const COPY = () => {
  window.testCopy = (c) => {
    const g = new OffscreenCanvas(c.width, c.height).getContext("2d");
    g.drawImage(c, 0, 0);
    return g;
  };
};
