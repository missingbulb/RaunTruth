import { WORDS } from "../web/reading.js";
import { cdnFile } from "../../../web-tests/fakes/cdn.mjs";
// A stand-in Tesseract for the Bookshelf Reader's page tests, and the reader it is kept as: the real one comes from a
// CDN the tests do not reach. It reads the BMP's own width and height: "Title <w>x<h>", 90% sure across, 20% sure up
// or down. It counts what it is asked in window.tess: the languages each worker was made for, and the crops read.
export const TESSERACT = `const tess = (globalThis.tess = { langs: [], reads: 0 });
export default { createWorker: async (langs) => (tess.langs.push(langs.join("+")), {
  setParameters: async () => {},
  recognize: async (b) => { tess.reads++; const v = new DataView(b.buffer, b.byteOffset); const w = v.getInt32(18, true), h = v.getInt32(22, true);
    return { data: { text: "Title " + w + "x" + h + "\\n", confidence: w > h ? 90 : 20 } }; },
  terminate: async () => {},
}) };`;
// the browser keys that choose it
export const seed = { "shelves-reader": JSON.stringify("tesseract") };
// A stand-in onnxruntime-web for the text finder Find books runs: no text anywhere, so the finder finds as on a
// photo with none. It counts the runs in window.textRuns.
export const ORT = `globalThis.textRuns = 0;
export const env = { wasm: {} };
export class Tensor { constructor(type, data, dims) { Object.assign(this, { type, data, dims }); } }
export const InferenceSession = { create: async () => ({ inputNames: ["x"], outputNames: ["y"],
  run: async (feeds) => { globalThis.textRuns++; const [, , h, w] = feeds.x.dims; return { y: { data: new Float32Array(h * w) } }; } }) };`;
const CDN = "https://cdn.jsdelivr.net/npm/";
// ctx: a browser context, the jsDelivr fake handing it the stand-ins for Tesseract and for the text finder; with
// textFinder false, the text finder's files are not found, as when it cannot be reached
export const prepare = async (ctx, { textFinder = true } = {}) => {
  cdnFile(ctx, CDN + "tesseract.js@7.0.0/dist/tesseract.esm.min.js", TESSERACT, "text/javascript");
  // the subtitle word list the readings are spelled by, a stand-in of two words
  cdnFile(ctx, WORDS.list, "את 100\nלא 90\n", "text/plain");
  if (!textFinder) return;
  cdnFile(ctx, CDN + "onnxruntime-web@1.31.1/dist/ort.wasm.min.mjs", ORT, "text/javascript");
  cdnFile(ctx, CDN + "@gutenye/ocr-models@1.4.2/assets/ch_PP-OCRv4_det_infer.onnx", Buffer.alloc(8), "application/octet-stream");
};
