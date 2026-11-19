// An Olympus cellSens image (req/shell/image/cellsens): a .vsi, whose tag tree says what the image is, and beside it
// _<name>_/stack1/frame_t_0.ets, whose tiles hold its pixels, one per channel and slice. The page keeps the two as one
// stored zip, the .vsi first (pairBytes), so the image is one file to everything that holds one.

// OpenJPEG's WebAssembly build, fetched the first time a JPEG 2000 tile is decoded
const OPENJPEG = "https://cdn.jsdelivr.net/npm/@cornerstonejs/codec-openjpeg@1.3.6/dist/";
const COMPRESSIONS = { 1: "an unknown format", 2: "JPEG", 5: "lossless JPEG", 8: "PNG", 9: "BMP" };
// tag numbers of the .vsi's tree
const IMAGE = 2001, DIMENSIONS = 2003, STACK = 2005, PIXEL = 2019, DIMENSION = 2007, ENTRY = 2008, NAME = 2419, LUT = 2004,
  STEP = 2013, UNIT = 268435456, VALUE = 268435458;
const NESTED = 0x10000000, EXTRA = 0x08000000;

export const etsPath = (name) => `_${name.replace(/\.vsi$/i, "")}_/stack1/frame_t_0.ets`;
export const isVsi = (name) => /\.vsi$/i.test(name);

// a .vsi on its own: a TIFF whose own header is followed at once by the cellSens tag tree, the image's details
// without its pixels
export const isVsiAlone = (b) => b.length > 12 && b[0] === 0x49 && b[1] === 0x49 && b[2] === 42 && b[10] === 0x49 && b[11] === 0x53;

// the .vsi named name and its .ets as the one file the page keeps: Uint8Array
export async function pairBytes(name, vsi, ets) {
  return new Uint8Array(await zip([{ name, bytes: vsi }, { name: etsPath(name), bytes: ets }]).arrayBuffer());
}

// the stored zip's files, {name: Uint8Array}; null when b is no zip holding a .vsi first
export function pairFiles(b) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength), out = {}, dec = new TextDecoder();
  let at = 0;
  while (at + 30 <= b.length && v.getUint32(at, true) === 0x04034b50) {
    const method = v.getUint16(at + 8, true), size = v.getUint32(at + 18, true), n = v.getUint16(at + 26, true), extra = v.getUint16(at + 28, true);
    const name = dec.decode(b.subarray(at + 30, at + 30 + n)), start = at + 30 + n + extra;
    if (method !== 0) return null;
    out[name] = b.subarray(start, start + size);
    at = start + size;
  }
  const names = Object.keys(out);
  return names.length && isVsi(names[0]) ? out : null;
}

// the file the store's checksum describes: a pair's .vsi, else the bytes themselves
export function storedPart(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), files = pairFiles(b);
  return files ? files[Object.keys(files)[0]].slice() : b;
}

// the .vsi's tag tree: [{tag, second, type, data | kids}]
function tree(b) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const volume = (at, depth) => {
    if (depth > 64 || at + 24 > b.length || v.getUint16(at + 2, true) !== 0x5349) return null;
    const first = Number(v.getBigUint64(at + 8, true)), count = v.getUint32(at + 16, true) & 0xfffffff, nodes = [];
    let fp = at + first;
    for (let i = 0; i < count && fp + 16 <= b.length; i++) {
      const ftype = v.getUint32(fp, true), tag = v.getUint32(fp + 4, true), next = v.getUint32(fp + 8, true), size = v.getUint32(fp + 12, true);
      let p = fp + 16, second = -1;
      if (ftype & EXTRA) { second = v.getInt32(p, true); p += 4; }
      const node = { tag, second, type: ftype & 0xffffff };
      if (ftype & NESTED) node.kids = volume(p, depth + 1) || [];
      else node.data = b.subarray(p, p + size);
      nodes.push(node);
      if (!next) break;
      fp = at + next;
    }
    return nodes;
  };
  return volume(8, 0) || [];
}

const kid = (n, tag) => n?.kids?.find((k) => k.tag === tag);
const kids = (n, tag) => (n?.kids || []).filter((k) => k.tag === tag);
const find = (nodes, tag) => { for (const n of nodes) { if (n.tag === tag) return n; const f = n.kids && find(n.kids, tag); if (f) return f; } return null; };
const view = (d) => new DataView(d.buffer, d.byteOffset, d.byteLength);
const text = (d) => (d ? new TextDecoder("utf-16le").decode(d).replace(/\0+$/, "").trim() : "");
const double = (d, k = 0) => (d && d.length >= 8 * (k + 1) ? view(d).getFloat64(8 * k, true) : null);
// a measure ("10^-6m^1" and a value) in micrometres
function microns(n) {
  const unit = text(kid(n, UNIT)?.data), value = double(kid(n, VALUE)?.data), m = unit.match(/^10\^(-?\d+)m\^1$/);
  return m && value != null ? value * 10 ** (Number(m[1]) + 6) : null;
}

// what the .vsi says of its image: {um, spacing, channels: [{name, colour}]}
function details(vsi) {
  const image = find(tree(vsi), IMAGE);
  if (!image) throw new Error("This .vsi file holds no image details.");
  const um = double(kid(kid(image, STACK), PIXEL)?.data);
  let spacing = null;
  const channels = [];
  for (const dim of kids(image, DIMENSION)) for (const e of kids(dim, ENTRY)) {
    const step = kid(e, STEP);
    if (step && spacing == null) spacing = microns(step);
    const name = kid(e, NAME);
    if (!name) continue;
    const lut = kid(kid(e, LUT), VALUE)?.data, c = {};
    if (text(name.data)) c.name = text(name.data);
    if (lut?.length === 768) c.colour = "#" + [lut[767], lut[766], lut[765]].map((x) => x.toString(16).padStart(2, "0")).join("");
    channels.push(c);
  }
  return { um: um > 0 ? um : null, spacing: spacing > 0 ? spacing : null, channels };
}

let openjpeg = null;
async function decodeJ2k(tile, w, h) {
  openjpeg ||= Promise.all([import(OPENJPEG + "openjpegwasm_decode.js/+esm"), fetch(OPENJPEG + "openjpegwasm_decode.wasm").then((r) => {
    if (!r.ok) throw new Error(`The JPEG 2000 decoder could not be fetched (${r.status}).`);
    return r.arrayBuffer();
  })]).then(([m, wasm]) => m.default({ wasmBinary: wasm, print: () => {}, printErr: () => {} }));
  const codec = await openjpeg, d = new codec.J2KDecoder();
  try {
    d.getEncodedBuffer(tile.length).set(tile);
    d.decode();
    const f = d.getFrameInfo();
    if (f.width !== w || f.height !== h || f.componentCount !== 1) throw new Error("A JPEG 2000 tile does not match its image.");
    return d.getDecodedBuffer().slice();
  } finally { d.delete(); }
}

// the .ets's pixels: {W, H, Z, C, bps, planes: [channel][slice] little-endian bytes}
async function pixels(ets) {
  const v = view(ets);
  if (String.fromCharCode(...ets.subarray(0, 3)) !== "SIS") throw new Error("The .ets file is not a cellSens pixel file.");
  const dims = v.getUint32(12, true), head = v.getUint32(16, true), table = Number(v.getBigUint64(32, true)), n = v.getUint32(40, true);
  if (String.fromCharCode(...ets.subarray(head, head + 3)) !== "ETS") throw new Error("The .ets file is not a cellSens pixel file.");
  const type = v.getUint32(head + 8, true), compression = v.getUint32(head + 20, true), tw = v.getUint32(head + 28, true), th = v.getUint32(head + 32, true);
  const bps = { 2: 1, 4: 2 }[type];
  if (!bps) throw new Error(`This cellSens image stores samples of a kind the page cannot read yet (type ${type}).`);
  if (compression !== 0 && compression !== 3) throw new Error(`This cellSens image stores its pixels as ${COMPRESSIONS[compression] || `format ${compression}`}, which the page cannot read yet.`);
  if (dims !== 6) throw new Error("This cellSens image is laid out in a way the page cannot read yet.");
  const tiles = [];
  for (let i = 0; i < n; i++) {
    const r = table + i * (4 + 4 * dims + 16), c = Array.from({ length: dims }, (_, k) => v.getUint32(r + 4 + 4 * k, true));
    tiles.push({ x: c[0], y: c[1], z: c[3], ch: c[4], more: c[2] || c[5], at: Number(v.getBigUint64(r + 4 + 4 * dims, true)), size: v.getUint32(r + 12 + 4 * dims, true) });
  }
  if (tiles.some((t) => t.more)) throw new Error("This cellSens image is a tiled pyramid, which the page cannot read yet.");
  const across = Math.max(...tiles.map((t) => t.x)) + 1, down = Math.max(...tiles.map((t) => t.y)) + 1;
  const W = across * tw, H = down * th, Z = Math.max(...tiles.map((t) => t.z)) + 1, C = Math.max(...tiles.map((t) => t.ch)) + 1;
  const planes = Array.from({ length: C }, () => Array.from({ length: Z }, () => new Uint8Array(W * H * bps)));
  for (const t of tiles) {
    const raw = ets.subarray(t.at, t.at + t.size), px = compression === 3 ? await decodeJ2k(raw, tw, th) : raw;
    if (px.length < tw * th * bps) throw new Error("A tile of this cellSens image is cut short.");
    const plane = planes[t.ch][t.z], row = tw * bps;
    for (let y = 0; y < th; y++) plane.set(px.subarray(y * row, (y + 1) * row), ((t.y * th + y) * W + t.x * tw) * bps);
  }
  return { W, H, Z, C, bps, compression, planes };
}

// the pair kept as one file: {W, H, Z, C, bps, planes, um, spacing, channels, compressed}
export async function readPair(b) {
  const files = pairFiles(b), names = Object.keys(files || {});
  const ets = names.find((n) => /\.ets$/i.test(n));
  if (!ets) throw new Error("This cellSens image came without its pixels (its _name_ folder's .ets file).");
  const d = details(files[names[0]]), p = await pixels(files[ets]);
  const channels = Array.from({ length: p.C }, (_, k) => d.channels[k] || {});
  return { ...p, um: d.um, spacing: p.Z > 1 ? d.spacing : null, channels, compressed: p.compression === 3 };
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// a ZIP of files [{name, bytes}], stored as they are: TIFF planes barely compress, and storing keeps it quick
function zip(files) {
  const enc = new TextEncoder(), local = [], central = [];
  let at = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.bytes), size = f.bytes.length;
    if (at + 30 + name.length + size > 2 ** 32 - 1) throw new Error("the image comes to more than 4 GB");
    const h = new Uint8Array(30 + name.length), v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true);
    v.setUint32(14, crc, true); v.setUint32(18, size, true); v.setUint32(22, size, true); v.setUint16(26, name.length, true);
    h.set(name, 30);
    const c = new Uint8Array(46 + name.length), cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, size, true); cv.setUint32(24, size, true); cv.setUint16(28, name.length, true);
    cv.setUint32(42, at, true); c.set(name, 46);
    local.push(h, f.bytes); central.push(c);
    at += h.length + size;
  }
  const dir = central.reduce((a, b) => a + b.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, dir, true); ev.setUint32(16, at, true);
  return new Blob([...local, ...central, end], { type: "application/zip" });
}
