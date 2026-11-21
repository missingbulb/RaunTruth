// The page's labelling of a reading's text (web/fields.js) on texts read from a JSON file, its fields written to
// another, for test_fields_page.py to hold against fields.label.
//   node studies/shelves/tests/fields_driver.mjs IN OUT
import fs from "node:fs";
import { label } from "../web/fields.js";

const [inFile, outFile] = process.argv.slice(2);
fs.writeFileSync(outFile, JSON.stringify(JSON.parse(fs.readFileSync(inFile, "utf8")).map((t) => label(t))));
