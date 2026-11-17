// The Bookshelf Reader's GT actions (web/gt_actions.js), on small hand-built books, under Node.
// Run: node tests/test_gt_actions.mjs
import assert from 'node:assert/strict';
import * as S from '../web/gt_actions.js';
import { actionLog, check } from '../../../web/truth_actions.js';

const DAY = '2026-11-17T10:00:00.000Z';
const act = (a) => ({ at: DAY, ...a });
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// what Find books and its first Read titles hand over: two standing spines and a cover, read as "Title 1", "Title 2", "Title 3"
const output = (over = {}) => ({ image: 'shelf.png', W: 400, H: 300, reader: 'tesseract', books: [
  { corners: rect(60, 40, 95, 280), view: 'spine', turn: 3, text: 'Title 1', confidence: .9, reader: 'tesseract' },
  { corners: rect(10, 20, 50, 280), view: 'spine', turn: 3, text: 'Title 2', confidence: .8, reader: 'tesseract' },
  { corners: rect(120, 100, 300, 280), view: 'cover', turn: 0, text: 'Title 3', confidence: .7, reader: 'tesseract' }], ...over });
const start = (over, previous) => S.start(output(over), previous);
const book = (m, id) => m.books.find((b) => b.id === id);
const doc = (m) => S.document(m);
const frozen = (x) => { if (x && typeof x === 'object') { Object.values(x).forEach(frozen); Object.freeze(x); } return x; };

const tests = {
  'a run gives each book an id b1, b2, b3 in the order found, with what the finder and the reader said kept as proposed'() {
    const m = start();
    assert.deepEqual(m.books.map((b) => b.id), ['b1', 'b2', 'b3']);
    assert.deepEqual(m.books.map((b) => b.source), ['found', 'found', 'found']);
    assert.deepEqual(book(m, 'b2').proposed, { corners: rect(10, 20, 50, 280), text: 'Title 2' });
    assert.equal(book(m, 'b1').verdict, null);
    assert.equal(m.noneMissed, false);
    assert.equal(m.reader, 'tesseract');
  },
  'a run again gives a book at the same corners (each within 3 px) its id, and a new book an id above both runs\''() {
    const before = start();
    const again = start({ books: [
      { ...output().books[2], corners: rect(121, 99, 301, 281) },
      { corners: rect(200, 20, 240, 280), view: 'spine', turn: 3, text: 'new', confidence: .5, reader: 'tesseract' },
      { ...output().books[0], corners: rect(60, 40, 95, 290) }], }, before);
    assert.equal(again.books[0].id, 'b3');
    assert.equal(again.books[1].id, 'b4');
    assert.ok(!['b1', 'b3', 'b4'].includes(again.books[2].id), 'a book 10 px off takes a new id, not the one it stood at');
    assert.equal(new Set(again.books.map((b) => b.id)).size, 3);
  },
  'move-corners stores the corners clockwise from the top left and sets the view from their shape'() {
    const m = start();
    const o = S.run(m, act({ type: 'move-corners', book: 'b1', corners: [[300, 200], [100, 100], [100, 200], [300, 100]] }));
    assert.deepEqual(book(o, 'b1').corners, [[100, 100], [300, 100], [300, 200], [100, 200]]);
    assert.equal(book(o, 'b1').view, 'cover');
    assert.equal(book(m, 'b1').view, 'spine', 'the model before is not changed');
  },
  'flip turns a book half a turn and marks the turn as the tagger\'s'() {
    const o = S.run(start(), act({ type: 'flip', book: 'b1' }));
    assert.equal(book(o, 'b1').turn, 1);
    assert.equal(book(o, 'b1').turnSet, true);
    assert.equal(book(S.run(o, act({ type: 'flip', book: 'b1' })), 'b1').turn, 3);
  },
  'set-text sets the title and marks it typed; the same title again changes nothing'() {
    const m = start(), o = S.run(m, act({ type: 'set-text', book: 'b1', text: 'Dune' }));
    assert.equal(book(o, 'b1').text, 'Dune');
    assert.equal(book(o, 'b1').typed, true);
    assert.deepEqual(S.run(o, act({ type: 'set-text', book: 'b1', text: 'Dune' })), { skip: 'nothing to change' });
  },
  'approve marks a book right, once'() {
    const o = S.run(start(), act({ type: 'approve', book: 'b3' }));
    assert.equal(book(o, 'b3').verdict, 'right');
    assert.deepEqual(S.run(o, act({ type: 'approve', book: 'b3' })), { skip: 'nothing to change' });
  },
  'add makes a book of the tagger\'s own kind of id, missed, undecided, and takes back none missed'() {
    let m = S.run(start(), act({ type: 'none-missed', on: true }));
    assert.equal(m.noneMissed, true);
    const o = S.run(m, act({ type: 'add', book: 'u1', corners: rect(330, 60, 380, 280) }));
    const b = book(o, 'u1');
    assert.deepEqual([b.source, b.verdict, b.text, b.proposed, b.view, b.turn], ['missed', null, '', null, 'spine', 0]);
    assert.equal(o.noneMissed, false);
    assert.deepEqual(S.run(o, act({ type: 'add', book: 'u1', corners: rect(1, 1, 2, 2) })), { skip: 'it is already there' });
    assert.equal(o.books.length, 4);
  },
  'delete takes a book away, found or added alike'() {
    const o = S.run(start(), act({ type: 'delete', book: 'b2' }));
    assert.deepEqual(o.books.map((b) => b.id), ['b1', 'b3']);
    assert.deepEqual(S.run(o, act({ type: 'delete', book: 'b2' })), { skip: 'its book is gone' });
  },
  'none-missed says it, and takes it back'() {
    const m = start();
    assert.equal(S.run(m, act({ type: 'none-missed', on: true })).noneMissed, true);
    assert.deepEqual(S.run(m, act({ type: 'none-missed', on: false })), { skip: 'nothing to change' });
  },
  'read keeps a title the tagger typed, takes the reader\'s answer otherwise, and fills proposed once'() {
    const m = start();
    const o = S.run(m, act({ type: 'read', book: 'b1', text: 'Again 1', confidence: .6, reader: 'lines', turn: 1 }));
    assert.deepEqual([book(o, 'b1').text, book(o, 'b1').confidence, book(o, 'b1').reader, book(o, 'b1').turn], ['Again 1', .6, 'lines', 1]);
    assert.equal(book(o, 'b1').proposed.text, 'Title 1', 'what was first proposed stays');
    const typed = S.run(S.run(m, act({ type: 'set-text', book: 'b1', text: 'Dune' })), act({ type: 'read', book: 'b1', text: 'Again 1', confidence: .6, reader: 'lines', turn: 1 }));
    assert.equal(book(typed, 'b1').text, 'Dune');
    assert.equal(book(typed, 'b1').turn, 1);
    assert.deepEqual(S.run(m, act({ type: 'read', book: 'b9', text: 'x', confidence: 1, reader: 'lines', turn: 0 })), { skip: 'its book is gone' });
    // an added book is proposed by none: what is read for it is no proposal
    const added = S.run(m, act({ type: 'add', book: 'u1', corners: rect(330, 60, 380, 280) }));
    assert.equal(book(S.run(added, act({ type: 'read', book: 'u1', text: 'Read', confidence: .5, reader: 'lines', turn: 3 })), 'u1').proposed, null);
  },
  'an action on a book that is gone is skipped'() {
    for (const a of [{ type: 'move-corners', corners: rect(1, 1, 5, 5) }, { type: 'flip' }, { type: 'set-text', text: 'x' }, { type: 'approve' }, { type: 'delete' }]) {
      assert.deepEqual(S.run(start(), act({ ...a, book: 'b9' })), { skip: 'its book is gone' }, a.type);
    }
  },
  'the document lists every book in the order they stand with its id, verdict, corners, turn and text, and what was proposed'() {
    let m = start();
    m = S.run(m, act({ type: 'approve', book: 'b2' }));
    m = S.run(m, act({ type: 'add', book: 'u1', corners: rect(330, 60, 380, 280) }));
    m = S.run(m, act({ type: 'none-missed', on: true }));
    const d = doc(m);
    assert.deepEqual(Object.keys(d), ['image', 'W', 'H', 'reader', 'books', 'none_missed']);
    assert.deepEqual(d.books.map((b) => b.id), ['b2', 'b1', 'b3', 'u1'], 'shelf by shelf, left to right');
    assert.deepEqual(d.books[0], { id: 'b2', source: 'found', verdict: 'right', corners: rect(10, 20, 50, 280), turn: 3, text: 'Title 2', proposed: { corners: rect(10, 20, 50, 280), text: 'Title 2' } });
    assert.equal(d.books[1].verdict, null);
    assert.ok(!('proposed' in d.books[3]) && d.books[3].source === 'missed');
    assert.equal(d.none_missed, true);
    assert.ok(!JSON.stringify(d).includes('typed') && !JSON.stringify(d).includes('confidence'));
  },
  'load is the document\'s inverse: a document of the loaded model is the document'() {
    let m = start();
    m = S.run(m, act({ type: 'approve', book: 'b2' }));
    m = S.run(m, act({ type: 'set-text', book: 'b1', text: 'Dune' }));
    m = S.run(m, act({ type: 'flip', book: 'b3' }));
    m = S.run(m, act({ type: 'add', book: 'u1', corners: rect(330, 60, 380, 280) }));
    m = S.run(m, act({ type: 'none-missed', on: true }));
    const d = doc(m), back = S.load(JSON.parse(JSON.stringify(d)));
    assert.deepEqual(doc(back), d);
    assert.equal(S.run(back, act({ type: 'delete', book: 'u1' })).books.length, 3, 'its ids are the file\'s');
    // the next ids are above those the file holds, so a book added after the file is loaded takes a free id
    const more = S.run(back, act({ type: 'add', book: S.nextAdded(back), corners: rect(1, 1, 9, 90) }));
    assert.equal(new Set(more.books.map((b) => b.id)).size, 5);
  },
  'a file from before the ids is loaded: the books given ids in order, only the books marked right there'() {
    const old = { image: 'shelf.png', W: 400, H: 300, reader: 'lines', books: [
      { source: 'found', verdict: 'right', corners: rect(10, 20, 50, 280), turn: 3, text: 'A', proposed: { corners: rect(10, 20, 50, 280), text: 'a' } },
      { source: 'missed', verdict: 'right', corners: rect(330, 60, 380, 280), turn: 0, text: 'B' }] };
    const m = S.load(old);
    assert.deepEqual(m.books.map((b) => [b.id, b.verdict, b.text, b.source]), [['b1', 'right', 'A', 'found'], ['b2', 'right', 'B', 'missed']]);
    assert.equal(m.noneMissed, true, 'a file that was submitted had said none was missed');
    assert.equal(doc(m).books[0].id, 'b1');
  },
  'every action undone and redone through the action log gives an equal document, step by step'() {
    const log = actionLog(S);
    log.open({ name: 'shelf.png' }, 'shelves');
    log.ran({ algorithm: { key: 'r9' }, output: output() });
    const docs = [doc(log.model)];
    const acts = [
      { type: 'move-corners', book: 'b1', corners: rect(58, 40, 95, 281) }, { type: 'flip', book: 'b1' }, { type: 'set-text', book: 'b1', text: 'Dune' },
      { type: 'approve', book: 'b1' }, { type: 'read', book: 'b2', text: 'Re', confidence: .4, reader: 'lines', turn: 1 },
      { type: 'add', book: 'u1', corners: rect(330, 60, 380, 280) }, { type: 'delete', book: 'b3' }, { type: 'none-missed', on: true }];
    for (const a of acts) { assert.ok(log.act(act(a)).model, a.type); docs.push(doc(log.model)); }
    assert.equal(new Set(docs.map((d) => JSON.stringify(d))).size, docs.length, 'every action changed the document');
    for (let k = acts.length; k > 0; k--) { log.undo(); assert.deepEqual(doc(log.model), docs[k - 1], `undone ${acts[k - 1].type}`); }
    for (let k = 1; k <= acts.length; k++) { log.redo(); assert.deepEqual(doc(log.model), docs[k], `redone ${acts[k - 1].type}`); }
  },
  'a run again carries the verdict to the book at the same corners, and skips an action whose book is gone'() {
    const log = actionLog(S);
    log.open({ name: 'shelf.png' }, 'shelves');
    log.ran({ algorithm: { key: 'r9' }, output: output() });
    log.act(act({ type: 'approve', book: 'b3' }));
    log.act(act({ type: 'set-text', book: 'b2', text: 'Dune' }));
    log.act(act({ type: 'add', book: 'u1', corners: rect(330, 60, 380, 280) }));
    log.ran({ algorithm: { key: 'r8' }, output: output({ books: [
      { ...output().books[2], corners: rect(121, 101, 299, 281), text: 'Re 3' }, { ...output().books[0], text: 'Re 1' }] }) });
    const m = log.model;
    assert.equal(book(m, 'b3').verdict, 'right', 'the book at the same corners is right again');
    assert.equal(book(m, 'b3').text, 'Re 3');
    assert.ok(book(m, 'u1'), 'a book the tagger added is still there');
    assert.ok(!book(m, 'b2'), 'the book that is no longer found is gone');
    assert.equal([...log.skipped.values()].length, 1, 'and the title typed for it was not carried over');
  },
  'no model is changed in place'() {
    let m = frozen(start());
    for (const a of [{ type: 'move-corners', book: 'b1', corners: rect(1, 1, 9, 90) }, { type: 'flip', book: 'b1' }, { type: 'set-text', book: 'b1', text: 'x' }, { type: 'approve', book: 'b1' },
      { type: 'add', book: 'u1', corners: rect(330, 60, 380, 280) }, { type: 'read', book: 'b1', text: 'y', confidence: 1, reader: 'lines', turn: 0 }, { type: 'none-missed', on: true }, { type: 'delete', book: 'b2' }]) {
      m = frozen(S.run(m, act(a)));
    }
  },
  'where is the book\'s box in image pixels, and null once the book is gone'() {
    const m = start();
    assert.deepEqual(S.where(act({ type: 'approve', book: 'b3' }), m), [120, 100, 300, 280]);
    assert.deepEqual(S.where(act({ type: 'flip', book: 'b1' }), m), [60, 40, 95, 280]);
    assert.equal(S.where(act({ type: 'delete', book: 'b2' }), S.run(m, act({ type: 'delete', book: 'b2' }))), null);
    assert.equal(S.where(act({ type: 'none-missed', on: true }), m), null);
    assert.equal(S.where(act({ type: 'run' }), m), null);
  },
  'describe reads every action'() {
    for (const a of [{ type: 'move-corners', book: 'b1' }, { type: 'flip', book: 'b1' }, { type: 'set-text', book: 'b1', text: 'Dune' }, { type: 'approve', book: 'b1' },
      { type: 'add', book: 'u1' }, { type: 'delete', book: 'b1' }, { type: 'none-missed', on: true }, { type: 'none-missed', on: false }, { type: 'read', book: 'b1', text: 'x' }]) {
      const one = S.describe(act(a), 1), many = S.describe(act(a), 3);
      assert.ok(one && one !== a.type && many !== one, a.type);
    }
    assert.equal(S.describe(act({ type: 'set-text', book: 'b1', text: 'Dune' }), 1), 'Set a title: Dune');
    assert.equal(S.describe({ type: 'run', output: output() }), '3 books');
  },
  'a check against the document it replays to says verified'() {
    return check(S, [{ type: 'open', at: DAY }, { type: 'run', at: DAY, output: output() }, act({ type: 'approve', book: 'b1' })],
      doc(S.run(start(), act({ type: 'approve', book: 'b1' }))), { now: () => DAY }).then((r) => assert.equal(r.replay, 'verified'));
  },
};

let n = 0;
for (const [name, fn] of Object.entries(tests)) { await fn(); n++; console.log('ok', name); }
assert.equal(n, Object.keys(tests).length);
