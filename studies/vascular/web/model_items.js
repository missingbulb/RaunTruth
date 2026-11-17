// The vessel model taken apart into its units of work, with no page: the junctions and the vessels (an edge from a junction
// to a junction or a tip) of a model, each with its numbers, and where a vessel lies in an area. The ground-truth tasks'
// cards and the study's GT actions both read them.
import * as Mo from './model.js';

export const SAMPLES = 8;             // curve samples per segment, for lengths and drawing
export const CROWD_UM = 20;           // how near another junction must be to count as crowding

// {junctions, vessels} of model m: each vessel an edge with its segments, its path, the state the extractor proposed
// for it (none when the owner drew it) and its numbers, zum the µm per slice; each junction a point where three or more
// live edges meet
export function build(m, zum) {
  if (!m) return { junctions: [], vessels: [] };
  const deg = Mo.degrees(m), all = Mo.degrees(m, Mo.live);
  const vessels = Mo.edges(m).map((e, k) => {
    let len = 0, rs = [];
    const path = e.segments.flatMap((i, j) => {
      const s = m.segments[i], pts = Mo.sampleSegment(m, i, SAMPLES);
      // a segment may run against its edge's direction
      return (s.a === e.ids[j] ? pts : pts.reverse()).slice(j ? 1 : 0);
    });
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      len += Math.hypot(b.x - a.x, b.y - a.y, (b.z - a.z) * zum);
    }
    for (const p of path) if (Number.isFinite(p.r)) rs.push(2 * p.r);
    const end = (id) => ((all.get(id) || 0) >= 3 ? 'junction' : (all.get(id) || 0) === 1 ? 'tip' : 'point');
    return { n: k + 1, ids: e.ids, segments: e.segments, state: e.state, proposed: e.proposed, confidence: e.confidence, path, length: len,
      width: rs.length ? rs.reduce((a, b) => a + b) / rs.length : null, wmin: rs.length ? Math.min(...rs) : null, wmax: rs.length ? Math.max(...rs) : null,
      ends: [end(e.ids[0]), end(e.ids.at(-1))] };
  });
  const junctions = [...all].filter(([, d]) => d >= 3).map(([id, d]) => {
    const n = m.nodes.get(id), confirmedDeg = deg.get(id) || 0;
    return { id, x: n.x, y: n.y, z: n.z, r: n.r, branches: d, pending: confirmedDeg < 3 || confirmedDeg !== d,
      neighbours: Mo.neighbours(m, id) };
  });
  // how crowded each junction's surroundings are: many junctions close together hints the trace went wrong there
  for (const j of junctions) j.crowd = junctions.filter((o) => o !== j && Math.hypot(o.x - j.x, o.y - j.y) < CROWD_UM).length;
  return { junctions, vessels };
}

// whether a point of the model lies in an area's box (µm): lower edges in, upper edges out, and a side of the box on the
// field's edge reaching past it, as a curve running past the field is in the area at that edge
export function inBox(m, box, p) {
  const W = m.size_px[0] * m.um_per_px, H = m.size_px[1] * m.um_per_px, eps = .005;
  return (box.x0 <= eps || p.x >= box.x0) && (box.x1 >= W - eps || p.x < box.x1) && (box.y0 <= eps || p.y >= box.y0) && (box.y1 >= H - eps || p.y < box.y1);
}
// an area done, as the model's reviewed_regions keep it: the box through the slices [first, last], with the day and the step
export const region = (box, slices, on) => ({ x: [box.x0, box.x1], y: [box.y0, box.y1], z: slices, on, step: 'area' });
