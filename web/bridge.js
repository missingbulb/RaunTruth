// The page's requests, answered by the study's algorithm (its study.json entry, imported as `study`) inside a
// Pyodide runtime that has already imported it and json. The worker runs it; the tests drive it outside a browser.
// It runs the same contract the lab runs (lab/README.md): the image file opened with study.read, `run` running one
// of study.VERSIONS on it, any other action one of study.STAGES on the last run's answer, which stays in Python.
// The page reads and shows the image itself; Python is handed the file's own bytes only for the study's algorithms.
// Messages in: open {name, bytes}, call {action, args, echo, damaged}, reply {value, bytes} (a service's answer), close.
// A call's damaged areas, the Study Manager's outlines in the image's pixels ([[[x, y], ...], ...], none for an image
// with none), reach a version or stage that takes `damaged`, for the study to leave out as it decides
// (req/shell/data/damaged).
// Messages out: progress {text}, held {}, ask {service, meta, bytes, echo} (a version asking the page for a service
// its environment has), result {action, meta, bytes, echo}. An answer's arrays travel as bytes, one after the other;
// in meta each is {$bytes: [offset, length], dtype, shape}.
// progress: the status line for each step while it runs, {open, <action>: text}, from study.json.
const PYTHON = `
import inspect as _inspect


def _encode(x):
    parts, at = [], [0]

    def walk(v):
        if getattr(v, 'ndim', 0) > 0 and hasattr(v, 'tobytes'):
            b = v.tobytes(); parts.append(b); at[0] += len(b)
            return {'$bytes': [at[0] - len(b), len(b)], 'dtype': str(v.dtype), 'shape': list(v.shape)}
        if isinstance(v, (bytes, bytearray)):
            parts.append(bytes(v)); at[0] += len(v)
            return {'$bytes': [at[0] - len(v), len(v)], 'dtype': 'uint8', 'shape': [len(v)]}
        if isinstance(v, dict):
            return {str(k): walk(w) for k, w in v.items()}
        if isinstance(v, (list, tuple)):
            return [walk(w) for w in v]
        if hasattr(v, 'item'):
            return v.item()
        return v
    meta = json.dumps(walk(x))
    return meta, (b''.join(parts) if parts else None)


def _decode(meta, data):
    def walk(v):
        if isinstance(v, dict) and '$bytes' in v:
            import numpy as np
            o, n = v['$bytes']
            return np.frombuffer(bytes(data[o:o + n]), v.get('dtype', 'uint8')).reshape(v.get('shape') or [n]).copy()
        if isinstance(v, dict):
            return {k: walk(w) for k, w in v.items()}
        if isinstance(v, list):
            return [walk(w) for w in v]
        return v
    return walk(json.loads(meta))


def _takes(fn, name):
    try:
        ps = _inspect.signature(fn).parameters.values()
    except (TypeError, ValueError):
        return False
    return any(p.name == name or p.kind == p.VAR_KEYWORD for p in ps)


class _Held:
    """The image open in Python, the last run's answer, and a version still waiting on a service."""

    def __init__(self, path):
        self.image, self.answer, self.going = study.read(path), None, None

    def start(self, action, args, damaged):
        if action == 'run':
            # the last answer let go first, so two are never held at once
            self.answer = None
            fn, before = study.VERSIONS[args.pop('algorithm')], (self.image,)
        elif action in getattr(study, 'STAGES', {}):
            fn, before = study.STAGES[action], (self.image, self.answer)
        else:
            raise ValueError(f'unknown action {action!r}')
        if _takes(fn, 'damaged'):
            args['damaged'] = damaged
        r = fn(*before, **args)
        self.ran = action == 'run'
        if _inspect.isgenerator(r):
            self.going = r
            return self.step(None, None, first=True)
        return self.done(r)

    def step(self, meta, data, first=False):
        try:
            request = next(self.going) if first else self.going.send(_decode(meta, data or b''))
        except StopIteration as e:
            self.going = None
            return self.done(e.value)
        name, *args = request
        return ('ask', name) + _encode(args)

    def done(self, answer):
        if self.ran:
            self.answer = answer
        return ('done', None) + _encode(answer)
`;

// working: runs a step of Python, counting the time it holds the thread (the worker's, or none)
export function bridge(py, post, progress = {}, working = (fn) => fn()) {
  const say = (text) => text && post({ type: "progress", text });
  py.runPython(PYTHON);
  // a (kind, service, JSON text, bytes or None) answer from Python, its handle destroyed: a handle to a Python
  // object keeps it alive until it is destroyed, whatever JavaScript collects
  const out = (r) => {
    const kind = r.get(0), service = r.get(1), meta = JSON.parse(r.get(2)), b = r.get(3);
    let bytes = null;
    if (b != null) { bytes = b.toJs(); b.destroy(); }
    r.destroy();
    return { kind, service, meta, bytes };
  };
  let waiting = null;
  const answer = async function answer(m) {
    const t0 = performance.now();
    if (m.type === "open") {
      say(progress.open || "Reading the image…");
      const path = "/tmp/" + m.name.replace(/[^\w.\-]/g, "_");
      py.FS.writeFile(path, new Uint8Array(m.bytes));
      py.globals.set("path", path);
      // the file is read once; kept, every image opened would stay in the worker's memory
      try { working(() => py.runPython("S = _Held(path)")); } finally { py.FS.unlink(path); }
      post({ type: "held", secs: (performance.now() - t0) / 1000 });
    } else if (m.type === "call") {
      say(progress[m.action]);
      py.globals.set("action", m.action);
      py.globals.set("args", JSON.stringify(m.args ?? {}));
      py.globals.set("damaged", JSON.stringify(m.damaged ?? []));
      let r = out(working(() => py.runPython("S.start(action, json.loads(args), json.loads(damaged))")));
      // a version asking for a service: the page answers it, and the version goes on from there
      while (r.kind === "ask") {
        const reply = new Promise((ok, no) => { waiting = { ok, no }; });
        post({ type: "ask", service: r.service, meta: r.meta, bytes: r.bytes, echo: m.echo }, r.bytes ? [r.bytes.buffer] : []);
        const { value, bytes } = await reply;
        py.globals.set("reply", JSON.stringify(value ?? null));
        py.globals.set("reply_bytes", bytes ? py.toPy(new Uint8Array(bytes)) : null);
        r = out(working(() => py.runPython("S.step(reply, reply_bytes)")));
      }
      post({ type: "result", action: m.action, meta: r.meta, bytes: r.bytes, echo: m.echo, secs: (performance.now() - t0) / 1000 }, r.bytes ? [r.bytes.buffer] : []);
    } else if (m.type === "close") {
      py.runPython("globals().pop('S', None)");
    }
  };
  // a service's answer: it goes to the version waiting on it, ahead of every message queued behind that version
  answer.reply = (m) => {
    const w = waiting; waiting = null;
    if (!w) return;
    if (m.error) w.no(new Error(m.error)); else w.ok(m);
  };
  return answer;
}
