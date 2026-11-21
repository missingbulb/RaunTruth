// The stand-in Drive's members option (stand_in_drive.mjs): ROOT is read by the members alone, a signed-in non-member
// and a signed-out reader refused it, and a folder in it shared with anyone with the link still read by both. Asks the
// Drive fake as its route would, with no page. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/stand_in_members_driver.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { driveAnswers } from "./fakes/google_drive.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "members-"));
fs.mkdirSync(path.join(dir, "root", "Data"), { recursive: true });
fs.writeFileSync(path.join(dir, "root", "Data", "a.txt"), "a");
fs.writeFileSync(path.join(dir, "answers.json"), "{}");

const { drive, google, ROOT, SUB, check, done } = await standIn({ answers: path.join(dir, "answers.json"), rootDir: path.join(dir, "root"), gt: false, members: ["member@acme.example"] });
const respond = driveAnswers(drive, google);
const member = google.signedIn({ email: "member@acme.example" }), stranger = google.signedIn({ email: "stranger@acme.example" });
const status = async (id, who) => (await respond({ method: "GET", url: `https://www.googleapis.com/drive/v3/files/${id}?fields=id` + (who ? "" : "&key=k"),
  headers: who ? { authorization: "Bearer " + who.token } : {}, body: null })).status;

await check((await status(ROOT, member)) === 200, "a member reads ROOT");
await check((await status(ROOT, stranger)) === 404 && (await status(ROOT, null)) === 404, "a signed-in non-member and a signed-out reader are refused ROOT");
await check((await status(SUB, stranger)) === 404, "and the folder in it, which inherits the members");
drive.get(SUB).access = "public";
await check((await status(SUB, stranger)) === 200 && (await status(SUB, null)) === 200, "a folder in it shared with anyone with the link is read by both");
fs.rmSync(dir, { recursive: true, force: true });
await done(0);
