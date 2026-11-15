# Reference digest — Sweeney et al. 2019, the blood-brain barrier from physiology to disease

> Self-contained digest of the source paper, **for what bears on our task**. **No need to reopen
> the PDF** for vessel structure; for BBB transport biology, see §6 (deliberately omitted).

- **Title:** *Blood-Brain Barrier: From Physiology to Disease and Back*
- **Authors:** Melanie D. Sweeney, Zhen Zhao, Axel Montagne, Amy R. Nelson,
  **Berislav V. Zlokovic** (corresponding). Zilkha Neurogenetic Institute, Keck School of Medicine,
  University of Southern California.
- **Venue / id:** *Physiological Reviews* **99**:21–78, January 2019 (published online
  October 3, 2018). DOI **10.1152/physrev.00050.2017**. 58 pages, ~700 references.
- **Licence:** "Copyright © 2019 the American Physiological Society" (page 21 footer). Not open
  access, so no figure images are committed (see [`figures/README.md`](figures/README.md)).
- **PDF:** not in the repo. It is kept in the study's Drive Literature folder as
  `sweeney-et-al-2018-blood-brain-barrier-from-physiology-to-disease-and-back.pdf`.
- **One-line thesis:** the BBB is a property of the whole neurovascular unit (endothelium,
  pericytes, smooth muscle cells, astrocytes, neurons), varies along the arterio-capillary-venous
  axis, and breaks down early in many neurodegenerative and acute CNS disorders, often before
  neurons are lost.

---

## 1. Why this matters to *our* task ⭐

**It is a review with no method and no images of its own, and it gives almost no vessel
morphometry.** What it gives is:

- **Qualitative vessel-type definitions by wall composition**, not by caliber (§2). These are
  the cell-based definitions a CD31-only image cannot see; they explain why our CATEGORIZE has to
  stand in caliber for cell type.
- **One whole-brain length figure** (human, ~400 miles of vessel, capillaries 85% of the length),
  which supports treating capillaries as the bulk of total centerline length (§3).
- **Directions of change** in capillary length or microvascular density across disorders (§4):
  reduced in Alzheimer's disease and ALS, *increased* in Huntington's disease and epilepsy,
  reduced by sensory deprivation in developing mouse barrel cortex. None comes with a number.
- **A list of primary sources** that do measure capillary length, density and pericyte coverage
  in mouse cortex and hippocampus (§5). Those are the papers worth fetching.

**What it does not give:** any vessel diameter or caliber cut-off, any capillary density or
length density per area or volume, any segment length, any branching statistic, any regional
(hippocampus vs cortex) vessel density, any number for how normal aging changes density, length
or diameter, any pericyte-coverage percentage. Each of these is a **gap**, not an oversight of
this digest: the text was searched for µm, diameter, density, length and coverage throughout.

## 2. Vessel types along the tree (Fig. 1 and §I)

As the review defines them, by wall cells rather than size:

| Segment | Mural cells | Other features stated |
|---|---|---|
| Penetrating arteries | **1–3 layers of smooth muscle cells (SMCs)**, enveloped by pia | Virchow-Robin space between pia and astrocytic glia limitans |
| Arterioles | SMCs **reduced to a single layer** | endothelium continuous with penetrating arteries and capillaries; covered by astrocytic endfeet |
| Precapillary arterioles | **pericytes** | listed with capillaries and venules as pericyte-bearing |
| Capillaries | **pericytes** sharing a basement membrane with endothelium (peg-and-socket contacts, N-cadherin, CX43) | covered by astrocytic endfeet; the main BBB site |
| Venules (incl. postcapillary) | pericytes | postcapillary venules are a main site of leukocyte diapedesis (MS section) |
| Veins, small arteries | SMCs (arterial and venous SMCs) | |

- **Zonation:** endothelial gene expression changes *gradually* along the arterio-capillary-venous
  axis (transcription factors dominate in arteries/arterioles, transporters in capillaries and
  veins), while mural cells fall into **two discrete groups: pericytes + venous SMCs vs arterial
  + arteriolar SMCs** (single-cell RNA-seq, ref. 610, Vanlandewijck 2018). For us: the
  endothelium, which CD31 labels, has no sharp boundary between vessel types, so a caliber
  threshold over a CD31 image is a convention, not a biological edge.
- **Pericytes regulate capillary diameter:** relaxation via ATP-sensitive K⁺ channels,
  contraction via voltage-gated Ca²⁺ channels (ref. 232, Hamilton 2010); the authors take this
  with pericyte-contractility experiments as support for pericytes regulating blood flow. Implies
  capillary diameter in fixed tissue depends on pericyte state at fixation. No magnitude is given.
- **No caliber numbers.** The review never gives a diameter for any of these segment types.
  For calibers use stefanitsch-2015 and blinder-2013.

## 3. The numbers it does quote

| Quantity | Value | Species | Cited source |
|---|---|---|---|
| Total length of cerebral vessels | **~400 miles** (≈ 640 km, our unit conversion) | human | refs 2, 460, 693: Abbott 2010, Pardridge 2015, Zlokovic 2011, all **reviews** themselves |
| Capillaries' share of vessel length | **85%** | human | same |
| Endothelial surface area for exchange | **~12 m²** | human | same |
| Brain share of cardiac output; of body O₂ and glucose | 20%; 20% | human | ref. 270 |
| BBB formation (barriergenesis) | embryonic day **E10–E15**; maturation continues after E15 and briefly after birth | mouse | ref. 682 |
| ALS: IgG in spinal cord / motor cortex | 40% to 90% of cases | human | refs 154, 163 |

**Caveat on the length figures:** the three cited sources are reviews; the primary measurement
behind "400 miles" and "85%" is not traceable from this paper. Treat them as order-of-magnitude
lore, not a reference value. They concern the whole human brain, not mouse, and not a 2D
section.

## 4. What disease and age do to vessels — directions only

All are qualitative in this review; no effect size is stated for any.

| Condition | Vessel structure change stated | Region | Species | Refs |
|---|---|---|---|---|
| Alzheimer's disease | **reduced capillary length**, microvascular degeneration, basement-membrane changes | post-mortem, not localized in the sentence | human | 36, 40, 230, 516, 527, 656 |
| Alzheimer's disease | **reduced pericyte coverage of capillaries and fewer pericytes** (PDGFRβ staining), worse with APOE4 | **cortex and hippocampus** | human | 527, 230 |
| Alzheimer's disease | pro-angiogenic factors up, yet **lost capillary networks not renewed** (MEOX2 loss, pericyte degeneration) | — | human | 213, 656, 570 |
| GLUT1 haploinsufficiency (*Slc2a1*⁺/⁻) | **microvascular regression**, reduced perfusion; later loss of cortical and hippocampal neurons | brain | mouse | 649 |
| Pericyte-deficient mice (*Pdgfrβ*⁺/⁻, *Pdgfb*^ret/ret, *Pdgfb*^F7/F7) | early pericyte loss and BBB breakdown; vascular phenotype precedes neuronal loss | brain | mouse | 28, 59, 130, 319, 650 |
| Huntington's disease | **ratio of capillaries to arterioles increased** (putamen, cortex, substantia nigra), read as angiogenesis; reduced pericyte coverage | putamen, cortex, SN | human | 155, 263, 364 |
| Huntington's R6/2 mice | **increased microvascular density** | brain | mouse | 263 |
| Parkinson's disease | aberrant angiogenesis | SN pars compacta, locus coeruleus, putamen | human | 144, 627 |
| Parkinson's with deep brain stimulation | **increased capillary length and density** vs untreated | subthalamic nucleus | human | 473 |
| ALS | **reduced microvascular density**, enlarged perivascular spaces; reduced pericyte coverage | brain stem, spinal cord (ventral horn) | human | 195, 243, 339, 415, 652, 662 |
| Temporal lobe epilepsy | **increased microvascular density** | **hippocampal** resections | human, rodent models | 499, 145 |
| HIV-associated dementia | microvascular degeneration, reduced pericyte coverage | — | human | 439, 471 |
| Sensory deprivation (deafferentation or blocked transmitter release) | **reduced vascular density**, postnatal | mouse **barrel cortex** | mouse | 340 |
| Chronic stimulation / seizures in neonates | near arrest of angiogenesis (NO-dependent) | barrel, auditory, motor cortex | mouse | 645 |
| CCM (KRIT1, CCM2, PDCD10) | enlarged, irregular small vessels, thin-walled capillaries | cortical white matter | human | 178 |

**Normal aging:** the review states no aging effect on vessel density, length or diameter. Its
only aging pointer is ref. 59 (Bell 2010, whose title is about pericytes "in the adult brain and
during brain aging") and ref. 170 (Farkas & Luiten 2001, a review of microvascular pathology in
aging and AD). For a measured aging effect in mouse, hill-2020 in this folder is the reference.

**For us:** microvascular density moves in *both* directions depending on condition (loss in AD
and ALS, gain in HD and epilepsy). A density or length difference between groups is therefore
not interpretable as "damage" without knowing the condition; and "more segments" can be real
angiogenesis, not only over-fragmentation by the pipeline.

## 5. Primary sources worth fetching

Ranked by fit to our task (mouse, cortex/hippocampus, capillary length or density measured in
sections). The review cites them; **what they measured beyond what is stated above is not in
this PDF**, so the "why" column rests on the review's sentence and the title.

| Ref | Citation | Why |
|---|---|---|
| 59 | Bell RD et al. Pericytes control key neurovascular functions and neuronal phenotype in the adult brain and during brain aging. *Neuron* 68:409–427, 2010. doi:10.1016/j.neuron.2010.09.043 | Mouse, pericyte deficiency **and aging**; the likeliest source of mouse capillary length per region |
| 340 | Lacoste B et al. Sensory-related neural activity regulates the structure of vascular networks in the cerebral cortex. *Neuron* 83:1117–1130, 2014. doi:10.1016/j.neuron.2014.07.034 | Mouse barrel cortex **vascular network structure quantified** (density change with deprivation) |
| 649 | Winkler EA et al. GLUT1 reductions exacerbate Alzheimer's disease vasculo-neuronal dysfunction and degeneration. *Nat Neurosci* 18:521–530, 2015. doi:10.1038/nn.3966 | Mouse **microvascular regression**, cortex and hippocampus |
| 319 | Kisler K et al. Pericyte degeneration leads to neurovascular uncoupling and limits oxygen supply to brain. *Nat Neurosci* 20:406–416, 2017. doi:10.1038/nn.4489 | Mouse pericyte loss, in vivo capillary imaging |
| 527 | Sengillo JD et al. Deficiency in mural vascular cells coincides with blood-brain barrier disruption in Alzheimer's disease. *Brain Pathol* 23:303–310, 2013. doi:10.1111/bpa.12004 | Human cortex and **hippocampus**, pericyte coverage, possibly capillary length |
| 230 | Halliday MR et al. Accelerated pericyte degeneration and blood-brain barrier breakdown in apolipoprotein E4 carriers with Alzheimer's disease. *J Cereb Blood Flow Metab* 36:216–227, 2016. doi:10.1038/jcbfm.2015.44 | Human, pericyte coverage and capillary changes by APOE genotype |
| 610 | Vanlandewijck M et al. A molecular atlas of cell types and zonation in the brain vasculature. *Nature* 554:475–480, 2018. doi:10.1038/nature25739 | Defines arterial/capillary/venous zones molecularly |
| 28 | Armulik A et al. Pericytes regulate the blood-brain barrier. *Nature* 468:557–561, 2010. doi:10.1038/nature09522 | Pericyte-deficient mouse vasculature |
| 656 | Wu Z et al. Role of the MEOX2 homeobox gene in neurovascular dysfunction in Alzheimer disease. *Nat Med* 11:959–965, 2005. doi:10.1038/nm1287 | Capillary loss in AD, mouse *Meox2*⁺/⁻ |
| 473 | Pienaar IS et al. Deep-brain stimulation associates with improved microvascular integrity in the subthalamic nucleus in Parkinson's disease. *Neurobiol Dis* 74:392–405, 2015. doi:10.1016/j.nbd.2014.12.006 | Human capillary length and density measured in sections |
| 499 | Rigau V et al. Angiogenesis is associated with blood-brain barrier permeability in temporal lobe epilepsy. *Brain* 130:1942–1956, 2007. doi:10.1093/brain/awm118 | **Hippocampal** microvascular density, human and rodent |
| 170 | Farkas E, Luiten PG. Cerebral microvascular pathology in aging and Alzheimer's disease. *Prog Neurobiol* 64:575–611, 2001. doi:10.1016/S0301-0082(00)00068-X | Review of aging microvasculature; a route to aging numbers |
| 232 | Hamilton NB, Attwell D, Hall CN. Pericyte-mediated regulation of capillary diameter. *Front Neuroenergetics* 2:5, 2010. doi:10.3389/fnene.2010.00005 | Capillary diameter control (open access) |

Citations are transcribed from the review's reference list.

## 6. What is not in this digest, and what is not in this PDF

**Deliberately omitted** (read and judged irrelevant to tracing, counting, categorizing or
measuring vessels): BBB developmental signalling (VEGF, Wnt, Gpr124/Reck, Shh, Ang-Tie2, PDGF-B,
TGF-β; Table 1); junctional proteins (adherens, tight, gap junctions; Fig. 2); the full
endothelial and pericyte transporter catalogue (carrier-, receptor-mediated, efflux, ion; Fig. 3);
perivascular/paravascular (glymphatic) and meningeal lymphatic clearance (Fig. 4); the genetics of
each monogenic and neurodegenerative disorder beyond its vessel phenotype (Figs. 5, 6); DCE-MRI,
PET and CSF/serum biomarkers (Q_alb) of BBB leakage; leukocyte trafficking in MS (Fig. 10);
stroke, TBI and spinal-cord-injury BBB time courses; BBB-based therapeutics and drug delivery
(§VI, Table 2). Cross-checked against the full text: no vessel diameter, density or length number
sits in those sections.

**Not in this PDF:** there is no supplementary material, no image data, no code. Nothing was
fetched from outside.

## 7. Extracted images

All ten figures are schematic drawings (cartoon cells, pathways, tables); there are no
micrographs. Nothing is committed and nothing enters the working dataset. Descriptions:
[`figures/README.md`](figures/README.md).
