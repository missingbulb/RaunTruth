// The DOM nodes detached from the document that the heap still holds, from a heap snapshot: how many of each, by the top
// of its detached tree and the chain of what holds it. What a node count outside the document is made of.
export async function detached(cdp, { depth = 6 } = {}) {
  let json = "";
  const take = (e) => { json += e.chunk; };
  cdp.on("HeapProfiler.addHeapSnapshotChunk", take);
  await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
  cdp.off("HeapProfiler.addHeapSnapshotChunk", take);
  const { snapshot: { meta }, nodes, edges, strings } = JSON.parse(json);
  const NF = meta.node_fields.length, EF = meta.edge_fields.length, f = (n) => meta.node_fields.indexOf(n);
  const nName = f("name"), nEdges = f("edge_count"), nDet = f("detachedness");
  const eType = meta.edge_fields.indexOf("type"), eName = meta.edge_fields.indexOf("name_or_index"), eTo = meta.edge_fields.indexOf("to_node");
  const types = meta.edge_types[eType], count = nodes.length / NF;
  const name = (i) => strings[nodes[i * NF + nName]], gone = (i) => nodes[i * NF + nDet] === 2;
  // each node's first strong retainer, and the edge it holds it by
  const by = new Int32Array(count).fill(-1), via = new Array(count);
  for (let i = 0, e = 0; i < count; i++) {
    for (let k = 0; k < nodes[i * NF + nEdges]; k++, e += EF) {
      const to = edges[e + eTo] / NF, t = types[edges[e + eType]];
      if (by[to] >= 0 || t === "weak") continue;
      by[to] = i; via[to] = t === "element" || t === "hidden" ? `[${edges[e + eName]}]` : strings[edges[e + eName]];
    }
  }
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (!gone(i) || (by[i] >= 0 && gone(by[i]))) continue;
    const short = (s) => (s.length > 60 ? s.slice(0, 57) + "…" : s), chain = [short(name(i))];
    for (let at = i, d = 0; d < depth && by[at] >= 0; d++, at = by[at]) chain.push(short(`${name(by[at])}.${via[at]}`));
    const key = chain.join(" ← ");
    out.set(key, (out.get(key) || 0) + 1);
  }
  return out;
}
// what is held more of in after than in before, most first
export const grown = (before, after, max = 12) => [...after].map(([k, n]) => [k, n - (before.get(k) || 0)]).filter(([, d]) => d > 0)
  .sort((a, b) => b[1] - a[1]).slice(0, max).map(([k, d]) => `${d} more × ${k}`);
