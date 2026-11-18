// The edits this study kept in the browser's own storage before it kept GT actions, under a key made of the model as the
// algorithm drew it: {edits, model}. The shell offers them once (shell.gt.legacy) and the key is forgotten when a draft holds them.

const SAVED = 'mv-model:';
// a short fingerprint of the model as drawn, so saved edits never attach to a different model
function fingerprint(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return (h >>> 0).toString(36); }

// the key of the edits kept for the model the algorithm drew, whose run's time is no part of it: the same model run again
// picked up the edits made to it
export function oldKey(meta) {
  const j = JSON.parse(JSON.stringify(meta));
  return SAVED + fingerprint(JSON.stringify(j.score ? { ...j, score: { ...j.score, seconds: null } } : j));
}

// {model, count, from, forget} for shell.gt.legacy: the edits kept for this model, or null when there are none
export function oldEdits(meta) {
  const key = oldKey(meta);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch { return null; }
  if (!saved?.edits || !saved.model) return null;
  return { model: saved.model, count: saved.edits, from: 'edits kept in this browser before Edit History',
    forget: () => { try { localStorage.removeItem(key); } catch { /* no storage */ } } };
}
