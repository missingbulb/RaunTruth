# Walk the page and file what it finds

Follow the [exploring-the-ui](../../skills/exploring-the-ui/SKILL.md) skill over the whole page, not one change:
its steps 1 to 4 choose, walk and triage, and this run files issues where the skill would hand over.

1. Set up the page tests as the repo's environment does, then walk **every** world in `web-tests/explore/worlds/`,
   focused on what changed in the last week:

   ```
   node web-tests/explore/explore.mjs --world WORLD --seed SEED --steps 200 --focus-diff "$(git rev-list -1 --before='8 days ago' origin/main)" --out /tmp/explore/WORLD-SEED
   ```

   Seeds start at the ISO week number (`date +%V`), so each week walks new ground, and go on as the skill's step 3
   says, until two seeds in a row add no new finding.
2. Triage each finding as the skill's step 4 says - a bug, a gap, a call, or an unexpected change that is right -
   and shrink it to its fewest steps. Fix nothing here, and change no file: an unexpected change that is right, or
   a finding that is the fake's, is filed too, as work on the tests.
3. Before filing, search the repo's open and closed issues for the finding's `sig`: one already filed gets a
   comment saying it recurred this week (world, seed, step), never a second issue; one closed as not planned is
   left alone.
4. File one issue per new finding, titled with what a person sees in a few words, labelled `explorer`. Its body:
   the class (bug, gap, call, tests), the `sig`, the world, seed and step, the shrunk steps and the command that
   replays them, what the page did and what was expected, and for a bug the requirement it breaks
   (`dev/requirements/requirements.md`). A call says the choice the owner has to make, as one question.
5. End with a summary comment on this run's work item: the worlds and seeds walked, the steps, and each issue
   filed or commented on, by class.
