---
name: designing-task-uis
description: Designing or reviewing a UI built around a person doing a task, such as tagging ground truth on desktop or phone - context first, then pre-mortem, data needs and a body-level walkthrough.
metadata:
  body: workflow
---

# Designing task-implementation UIs

A task UI exists so a person finishes a piece of work: tag, verify, transcribe, approve. It is judged
by what the work costs that person and by what the output is worth, never by how it looks. This skill
is the method for designing one or reviewing one that exists. What a study's ground-truth controls
look like on the desktop page is `designing-ground-truth-tasks`; this skill is how to arrive at, or
question, such a design.

## 1. Pin the context of use before any screen

Write these down first; they change every later answer:

| Question | Why it matters |
|---|---|
| Device and input: mouse and keyboard, or a thumb on a 6" screen? | Target sizes, precision, what can be dragged, whether hover exists |
| Attention: dedicated work at a desk, or snatched minutes, noise, glare, one hand? | The unit of work: a focused session can carry an area with several decisions; a distracted one needs the smallest unit of concentration, one question answerable in seconds |
| Who answers: the lead researcher, or a trained helper? | Whether a question may need judgment only the lead has |
| How much work exists: items per input, inputs to come, people to share it? | Whether a build repays itself at all; ask the owner when it is not on record |

When two contexts are in play (desktop and phone), list their differences explicitly before designing
either; a design carried from one to the other unexamined fails on the first difference.

## 2. Decompose the work for that context

- **Start from what the output must be**: the same ground truth the existing path makes, or a stated
  weaker tier (say which fields, and why). A label that cannot be told apart from the stronger tier
  must say where it came from (`how`, `source`, votes).
- **Turn judgments into the smallest question the context needs**: yes/no on a candidate, one of a
  few options, a tap on a place. Add algorithmic extraction where it makes a question answerable
  (pre-cut crops, a straightened strip, alternatives taken from the algorithm's own rejects, two
  views chosen by the lab instead of playback). A coarse "does this area look right?" may close a
  stage, but only after simpler steps.
- **Measure the workload on real data** before sizing anything: items per input, how many of them are
  low-prior, duplicates, what the screen would show at the size it is shown. A count copied from a
  stale doc is the commonest wrong number.

## 3. Review it, three ways, with an unanchored reviewer

Have a separate agent (Fable when the owner asks for it) review a design it did not write, against
the code and real counts, then let the designer revise and say where it disagrees. The review asks:

1. **Assume it failed six months in: why?** At least eight concrete stories across person, data,
   owner and technology, each with a likelihood and a change that prevents it. Look hardest for the
   output echoing the algorithm (a default answer, approval by omission, a reflex button), for work
   that never starts (no gold, an unapproved call), and for people who never come back.
2. **What did each decision need?** For every question, what the person must see or know to answer,
   and whether the screen shows it: context beyond the crop, the whole-input brightness, depth, the
   neighbour, an edge of the input mistaken for a feature. Missing evidence makes the answer a guess
   however fast it is.
3. **Walk it from the body.** Narrate every step of every answer path as eyes, attention and fingers
   do it: where the eyes go and how far (mm), how many fixations, what must be held in memory, any
   wait for an animation, the target's size and the hand's reach. Include the bad paths: a wrong
   answer and its undo, "can't tell", an interruption and the return, the other hand, glare or noise
   where the context has them. Mark each step **fine, taxing, grueling, futile or redundant**, and sum
   the per-answer time from the steps to test the design's own claim.

Then change each taxing, grueling, futile or redundant step: put the answer under the evidence, drop
a step nobody can do, replace motion with stills, make undo name what it undoes, put the common answer
under the thumb that holds the device. Reject any change that buys speed by letting silence count as
an answer.

## 4. Show it and hand over the decisions

- Render the screens and show them; the picture leads, the numbers follow, each number with its
  trust (measured, or built from textbook seconds).
- Draw marks in a colour the data does not carry, and check it against the real palette.
- Hand the owner every call that is theirs as its own question: a departure from an existing UI rule,
  a new tier of truth, each network call or permission, whether the build pays.
- Name the cheapest test before any code: the owner answering a few dozen questions on paper or a
  click-through prototype, timed.
