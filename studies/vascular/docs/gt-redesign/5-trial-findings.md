# What the real cards showed, before anyone was timed (2026-11-28)

The [card trial](paper_test/) cut 20 junction cards and 30 width cards from `cd31_ca1_x20_r_2_slices1-24` and the
default algorithm's (v5) model of it: 386 vessels and 178 junctions. Half the junctions were drawn at random. The
other half were the ones whose arms differ most in depth, plus pairs of junctions close enough to be asked about as
one. The owner's timed run is still to come; the figures below come from the cards themselves, not from a person.

## Findings

1. **The depth-coloured crop is what separates a crossing from a branch.** In the grey crop a crossing and a branch
   look the same. Coloured by the slice where each pixel is brightest, two vessels at different depths show as two
   colours passing through each other. This is the junction card's main evidence, so it is shown **beside** the grey
   crop, not behind a held key.
2. **Arm depths are spread wide.** In the sample, half the junctions have arms more than 4 µm apart in depth (1.0 to
   13.6 µm). The sample was weighted towards such junctions on purpose, so this says the hard case exists, not how
   often it occurs.
3. **Two close junctions often make up one crossing.** 3 of the 20 items were two junctions joined by a vessel shorter
   than two widths. Asking about them as one item stays in the design.
4. **The half-height width and the algorithm's width disagree.** They differ by more than 15% on 16 of 30 vessels
   (median ratio 1.15, interquartile range 0.98 to 1.25). A lumpy profile, with a neighbour or a vessel wall inside
   the window, pushes the half-height width up. So neither number is a neutral anchor: the card shows both, draws only
   the half-height edges, and the person decides.
5. **Some traced vessels are not on the signal.** In 2 of the first 4 width cards the line runs beside the bright
   vessel or over a faint one. The width card is the one visit every confident vessel gets, so its **Not a vessel**
   key carries the existence check, as the design meant.
6. **Sampling at rounded depths leaves seams in the straightened strip.** Each column comes from the slices at the
   vessel's rounded depth, and the strip jumps where that depth changes. Interpolating between slices fixes it; the
   page's card does.

## Amendments to the [revised design](4-revised-design.md)

- The junction card shows the grey crop and the depth-coloured crop side by side, each arm's depth at its end.
- The width card shows the algorithm's width beside the half-height width. When the profile has a second peak
  inside the window, it says `profile has a second peak` and draws no edges, and the person sets the width with
  A and S starting from the algorithm's value.
- Everything else stands.
