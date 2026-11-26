// The images a page test hands the page, each {name, mimeType, bytes}, for a Drive folder to hold (world.mjs) or a
// file chooser to pick. Drawn in the test, never a study's real data.
//   image.png("a.png", { width, height, seed })          noise, different for each seed
//   image.greyPng("g.png", { width, height, value })     one grey value, or value(x, y) each pixel's
//   image.tiff("s.tif", { width, height, planes, value, description, bps, resolution, headFirst })
//     planes of width x height, value(plane, x, y) each pixel's; description: the ImageJ header, if any;
//     resolution: [x, y], the pixels per unit, each a TIFF rational [numerator, denominator], if any;
//     headFirst: the IFD before the pixels, so a reader of the file's head alone has its shape, where ImageJ's own
//     layout (the page's writeTiff) has them last
//   image.bytes("x.vsi", n, mimeType)                     n bytes of nothing a reader could use
import { noisePng, greyPng } from "./png_fixture.mjs";
import { writeTiff } from "../web/tiff_file.js";

const TYPES = { png: "image/png", tif: "image/tiff", tiff: "image/tiff", jpg: "image/jpeg", jpeg: "image/jpeg" };
const typeOf = (name) => TYPES[name.split(".").pop().toLowerCase()] || "application/octet-stream";

function headFirstTiff(W, H, planes, desc, value) {
  const tags = [[256, 4, W], [257, 4, H], [258, 3, 16], [259, 3, 1], [262, 3, 1], [270, 2, 0], [273, 4, 0], [277, 3, 1], [278, 4, H], [279, 4, W * H * 2]];
  if (desc == null) tags.splice(5, 1);
  const ifd = 8, text = desc == null ? Buffer.alloc(0) : Buffer.from(desc + "\0", "latin1");
  const at = ifd + 2 + tags.length * 12 + 4, data = at + text.length + (text.length % 2);
  const out = Buffer.alloc(data + planes * W * H * 2);
  out.write("II", 0, "latin1"); out.writeUInt16LE(42, 2); out.writeUInt32LE(ifd, 4); out.writeUInt16LE(tags.length, ifd);
  tags.forEach(([tag, type, v], i) => {
    const e = ifd + 2 + i * 12;
    out.writeUInt16LE(tag, e); out.writeUInt16LE(type, e + 2);
    if (tag === 270) { out.writeUInt32LE(text.length, e + 4); out.writeUInt32LE(at, e + 8); }
    else { out.writeUInt32LE(1, e + 4); out.writeUInt32LE(tag === 273 ? data : v, e + 8); }
  });
  text.copy(out, at);
  for (let k = 0; k < planes; k++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.writeUInt16LE(value(k, x, y), data + 2 * ((k * H + y) * W + x));
  return out;
}

export const image = {
  png: (name, { width = 200, height = width, seed = 1 } = {}) => ({ name, mimeType: "image/png", bytes: noisePng(width, height, seed) }),
  greyPng: (name, { width, height = width, value }) => ({ name, mimeType: "image/png", bytes: greyPng(width, height, typeof value === "function" ? value : () => value) }),
  tiff(name, { width, height = width, planes = 1, value = () => 0, description, bps = 2, resolution: [xres, yres] = [], headFirst = false }) {
    if (headFirst) return { name, mimeType: "image/tiff", bytes: headFirstTiff(width, height, planes, description, value) };
    const Arr = bps === 1 ? Uint8Array : Uint16Array;
    const all = Array.from({ length: planes }, (_, k) => Arr.from({ length: width * height }, (_, i) => value(k, i % width, Math.floor(i / width))));
    return { name, mimeType: "image/tiff", bytes: Buffer.from(writeTiff({ w: width, h: height, bps, planes: all.map((p) => new Uint8Array(p.buffer)), xres, yres, description })) };
  },
  bytes: (name, n, mimeType = typeOf(name)) => ({ name, mimeType, bytes: Buffer.alloc(n) }),
};
