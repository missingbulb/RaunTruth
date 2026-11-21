// The page's straightening (web/straighten.js) on a photo and boxes read from a JSON file, its crops written to
// another, for test_straighten.py to hold against books.straighten.
//   node studies/shelves/tests/straighten_driver.mjs IN OUT
import fs from "node:fs";
import { straighten } from "../web/straighten.js";

const [inFile, outFile] = process.argv.slice(2);
const { W, H, planes, boxes } = JSON.parse(fs.readFileSync(inFile, "utf8"));
const image = { W, H, planes: Uint8Array.from(Buffer.from(planes, "base64")) };
const crops = boxes.map((corners) => { const c = straighten(image, corners); return { width: c.width, height: c.height, data: Buffer.from(c.data).toString("base64") }; });
fs.writeFileSync(outFile, JSON.stringify(crops));
