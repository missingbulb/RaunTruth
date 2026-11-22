// Who may open which study (shell/study/members, req/shell/study/visibility, shell/study/review-link): Drive's sharing
// decides. A study's root is members-only until the owner shares it by link, so whoever can read the root is a member;
// the stage only says whether the study is also listed for everyone.
"use strict";

// the stages that list a study for everyone, signed in or not
const RELEASED = ["Public"];
export const released = (stage) => RELEASED.includes(stage);

// The ids of the studies whose root the signed-in user can read, asked of the store in one batch request.
// studies: [{id, root}], root the store's id of the study's root folder, null for a study with none (nothing to read).
export async function members(remote, studies) {
  const asked = studies.filter((s) => s.root);
  if (!asked.length) return [];
  const answers = await remote.batch(asked.map((s) => `files/${encodeURIComponent(s.root)}?fields=id`));
  return asked.filter((s, k) => answers[k] === 200).map((s) => s.id);
}

// Whether a study listed in the switcher is offered to a visitor: one with no root to read, a released one, and, signed
// in, one whose root they can read (ids: the studies members() gave).
export const offers = (study, { signedIn, ids }) => !study.root || released(study.stage) || (signedIn && !!ids?.includes(study.id));
