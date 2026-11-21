// Runs the Drive fake (fakes/google_drive.mjs) under Node, with no browser, asking its API as the page does: what a
// per-account share lets each account read, the batch endpoint answering each part as its single call would, the
// revisions a replace keeps, and the permissions it lists and changes. Exits 1 on a failed check.
//   node web-tests/fake_drive_driver.mjs
import { driveUnderNode } from "./fakes/google_drive_under_node.mjs";
import { SCOPES } from "./fakes/google_sign_in.mjs";

const KEY = "stand-in-key";
const { drive, signIn: google } = driveUnderNode({ apiKey: KEY });
const BASE = "https://www.googleapis.com";
const member = google.signedIn({ email: "member@acme.example", token: "member-token", scopes: SCOPES });
const stranger = google.signedIn({ email: "stranger@acme.example", token: "stranger-token", scopes: SCOPES });
const manager = google.signedIn({ email: "manager@acme.example", token: "manager-token", scopes: SCOPES });

let failed = 0;
const check = (ok, what, seen) => {
  if (ok) console.log("ok: " + what);
  else { failed++; console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); }
};
// a request to Drive's API as who (a sign-in) or, with none, as the site's key; the answer's status, text and JSON
async function ask(method, path, { who, body, headers = {} } = {}) {
  const url = BASE + path + (who ? "" : (path.includes("?") ? "&" : "?") + "key=" + KEY);
  const r = await fetch(url, { method, body, headers: { ...(who ? { authorization: "Bearer " + who.token } : {}), ...headers } });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: r.status, text, json, type: r.headers.get("content-type") };
}
const get = (id, who, fields = "id,name") => ask("GET", `/drive/v3/files/${id}?fields=${encodeURIComponent(fields)}`, { who });
const statuses = async (ids, who) => (await Promise.all(ids.map((id) => get(id, who)))).map((r) => r.status);

// a members-only root with a link-shared Data folder in it, and the study file in the root
const ROOT = "membersroot0000000001", DATA = "datafolder0000000001", STUDY = "studyfile0000000001", INNER = "innerfolder000000001", OWN = "ownreaders00000000001";
drive.folder({ id: ROOT, name: "Members root", access: "private" });
drive.readers.set(ROOT, new Set(["member@acme.example"]));
drive.folder({ id: DATA, name: "Data", parent: ROOT, access: "public" });
drive.file({ id: STUDY, name: "rauntruth-study.json", parent: ROOT, bytes: Buffer.from("{}") });
drive.folder({ id: INNER, name: "Inner", parent: ROOT });
drive.folder({ id: OWN, name: "Own readers", parent: ROOT });
drive.readers.set(OWN, new Set(["stranger@acme.example"]));

check(JSON.stringify(await statuses([DATA, ROOT], null)) === "[200,404]", "signed out, the link-shared Data is read and the members-only root is refused");
check(JSON.stringify(await statuses([ROOT, STUDY, DATA], member)) === "[200,200,200]", "a member reads the root, the study file in it and Data");
check(JSON.stringify(await statuses([ROOT, STUDY, INNER], stranger)) === "[404,404,404]", "a non-member signed in is refused the root, the study file and a folder that inherits the root's readers");
check((await get(DATA, stranger)).status === 200, "a non-member signed in reads the link-shared Data");
check(JSON.stringify(await statuses([OWN], stranger)) === "[200]" && JSON.stringify(await statuses([OWN], member)) === "[404]",
  "an item with readers of its own has those alone, not its parent's");
{
  const list = await ask("GET", `/drive/v3/files?q=${encodeURIComponent(`'${ROOT}' in parents`)}&fields=files(id)`, { who: member });
  const refused = await ask("GET", `/drive/v3/files?q=${encodeURIComponent(`'${ROOT}' in parents`)}&fields=files(id)`, { who: stranger });
  check(list.status === 200 && list.json.files.length === 4 && refused.status === 404, "a members-only folder lists for a member and is refused a non-member");
}
{
  const open = "unsharedroot00000001";
  drive.folder({ id: open, name: "Nothing seeded", access: "private" });
  check((await get(open, stranger)).status === 200 && (await get(open, null)).status === 404, "with no readers seeded, any signed-in user sees what the link does not reach, as before");
}

// the batch endpoint
{
  const boundary = "batch_boundary_one";
  const part = (n, line) => `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <item${n}>\r\n\r\n${line}\r\n\r\n`;
  const body = part(1, `GET /drive/v3/files/${ROOT}?fields=id,name HTTP/1.1`) + part(2, `GET /drive/v3/files/${STUDY}?fields=id,name HTTP/1.1`)
    + part(3, `GET /drive/v3/files/nosuchfile00000000001?fields=id,name HTTP/1.1`) + `--${boundary}--`;
  const r = await ask("POST", "/batch/drive/v3", { who: member, body, headers: { "content-type": `multipart/mixed; boundary=${boundary}` } });
  const out = r.text.match(/^--(\S+)/)?.[1];
  const answers = out ? r.text.split("--" + out).slice(1, -1).map((p) => ({
    id: p.match(/Content-ID: <?response-item(\d+)>?/i)?.[1], status: +p.match(/HTTP\/1\.1 (\d+)/)?.[1], json: JSON.parse(p.slice(p.indexOf("{"), p.lastIndexOf("}") + 1)),
  })) : [];
  check(r.status === 200 && /^multipart\/mixed; boundary=/.test(r.type), "a batch request is answered as multipart/mixed", { status: r.status, type: r.type });
  check(JSON.stringify(answers.map((a) => [a.id, a.status])) === '[["1",200],["2",200],["3",404]]', "three GET parts, one of a file there is not, come back as three parts with 200, 200, 404", answers);
  check(answers[0]?.json.name === "Members root" && answers[1]?.json.name === "rauntruth-study.json", "each part carries its single call's answer", answers);
  const refused = await ask("POST", "/batch/drive/v3", { who: stranger, body, headers: { "content-type": `multipart/mixed; boundary=${boundary}` } });
  check(JSON.stringify([...refused.text.matchAll(/HTTP\/1\.1 (\d+)/g)].map((m) => +m[1])) === "[404,404,404]", "a batch is answered for the account that sent it, a non-member refused the members' files");
  check(drive.calls.some((c) => c.kind === "batch") && drive.calls.filter((c) => c.batched).length >= 3, "the batch and each of its parts are logged in the calls");
}

// revisions
{
  const doc = "revisedfile000000001";
  drive.file({ id: doc, name: "mine.json", parent: DATA, bytes: Buffer.from("first"), mine: true });
  const replace = (bytes) => ask("PATCH", `/upload/drive/v3/files/${doc}?uploadType=media`, { who: member, body: bytes });
  check((await replace("second")).status === 200 && (await replace("third")).status === 200, "a file the page made is replaced twice");
  const list = await ask("GET", `/drive/v3/files/${doc}/revisions?fields=${encodeURIComponent("revisions(id,modifiedTime,size)")}`, { who: member });
  const ids = list.json?.revisions?.map((v) => v.id);
  check(list.status === 200 && ids?.length === 3 && new Set(ids).size === 3, "created, then replaced twice, three revisions are listed, the current one included", list.text);
  const first = await ask("GET", `/drive/v3/files/${doc}/revisions/${ids?.[0]}?alt=media`, { who: member });
  const second = await ask("GET", `/drive/v3/files/${doc}/revisions/${ids?.[1]}?alt=media`, { who: member });
  const head = await ask("GET", `/drive/v3/files/${doc}/revisions/${ids?.[2]}?alt=media`, { who: member });
  check(first.text === "first" && second.text === "second" && head.text === "third", "each revision's bytes read back: the first as created, the second after one replace, the last as the file is now", [first.text, second.text, head.text]);
  check((await get(doc, member)).status === 200 && (await ask("GET", `/drive/v3/files/${doc}?alt=media`, { who: member })).text === "third", "the file itself reads as the last replace left it");
  check((await ask("GET", `/drive/v3/files/${doc}/revisions/nosuchrevision?alt=media`, { who: member })).status === 404, "a revision there is not is refused");
  check((await ask("GET", `/drive/v3/files/${doc}/revisions`, { who: stranger })).status === 200, "a revision of a link-shared file is listed to a non-member");
  check((await ask("GET", `/drive/v3/files/${ROOT}/revisions`, { who: stranger })).status === 404, "and one of a members-only file is refused them");
}

// permissions
{
  drive.writers.set(ROOT, new Set(["manager@acme.example"]));
  const asks = (who) => ask("GET", `/drive/v3/files/${ROOT}/permissions?fields=${encodeURIComponent("permissions(id,type,role,emailAddress)")}`, { who });
  const listed = await asks(manager);
  const by = Object.fromEntries((listed.json?.permissions || []).map((p) => [p.emailAddress, p]));
  check(listed.status === 200 && by["member@acme.example"]?.role === "reader" && by["member@acme.example"]?.type === "user" && by["manager@acme.example"]?.role === "writer",
    "the seeded root's permissions list its readers and writers as Drive does, with type, role and emailAddress", listed.text);
  const plain = await ask("GET", `/drive/v3/files/${ROOT}/permissions`, { who: manager });
  check(plain.json?.permissions?.every((p) => p.id && p.type && p.role && !("emailAddress" in p)), "without fields, a permission has its id, type and role alone, as Drive's default", plain.text);
  check((await asks(stranger)).status === 404, "a non-member is refused the permissions of what they cannot read");

  const writes = drive.writes.length;
  const added = await ask("POST", `/drive/v3/files/${ROOT}/permissions`, { who: manager, body: JSON.stringify({ type: "user", role: "reader", emailAddress: "stranger@acme.example" }), headers: { "content-type": "application/json" } });
  check(added.status === 200 && (await get(ROOT, stranger)).status === 200, "a permission added for a user lets that account read", added.text);
  const after = await asks(manager);
  const added1 = after.json.permissions.find((p) => p.emailAddress === "stranger@acme.example");
  check(added1?.role === "reader", "and is listed", after.text);
  const removed = await ask("DELETE", `/drive/v3/files/${ROOT}/permissions/${added1?.id}`, { who: manager });
  check(removed.status === 204 && (await get(ROOT, stranger)).status === 404 && !(await asks(manager)).text.includes("stranger@acme.example"),
    "deleting it by its id takes the access away and the listing leaves it out", removed.status);
  check(JSON.stringify(drive.writes.slice(writes)) === JSON.stringify([["share", "Members root"], ["unshare", "Members root"]]), "the add and the delete are logged as writes", drive.writes.slice(writes));
  const nobody = await ask("DELETE", `/drive/v3/files/${ROOT}/permissions/nosuchpermission`, { who: manager });
  check(nobody.status === 404, "deleting a permission there is not is refused", nobody.status);
  const denied = await ask("POST", `/drive/v3/files/${ROOT}/permissions`, { who: member, body: JSON.stringify({ type: "user", role: "reader", emailAddress: "x@acme.example" }), headers: { "content-type": "application/json" } });
  check(denied.status === 404, "an account that is not a writer cannot change the permissions", denied.status);
  const link = await ask("POST", `/drive/v3/files/${INNER}/permissions`, { who: manager, body: JSON.stringify({ type: "anyone", role: "reader" }), headers: { "content-type": "application/json" } });
  check(link.status === 200 && (await get(INNER, null)).status === 200, "sharing with anyone with the link lets a signed-out reader in", link.status);
  const unlink = await ask("DELETE", `/drive/v3/files/${INNER}/permissions/anyoneWithLink`, { who: manager });
  check(unlink.status === 204 && (await get(INNER, null)).status === 404, "and deleting that permission takes it away", unlink.status);
}

process.exit(failed ? 1 : 0);
