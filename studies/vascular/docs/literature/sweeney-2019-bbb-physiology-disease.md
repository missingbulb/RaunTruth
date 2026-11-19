# Reference digest — Sweeney et al. 2019, the blood-brain barrier from physiology to disease

- **Title:** *Blood-Brain Barrier: From Physiology to Disease and Back*
- **Authors:** Melanie D. Sweeney, Zhen Zhao, Axel Montagne, Amy R. Nelson,
  **Berislav V. Zlokovic** (corresponding). Zilkha Neurogenetic Institute, Keck School of Medicine,
  University of Southern California.
- **Venue / id:** *Physiological Reviews* **99**:21–78, January 2019 (published online
  October 3, 2018). DOI **10.1152/physrev.00050.2017**. 58 pages, ~700 references.
- **Licence:** "Copyright © 2019 the American Physiological Society" (page 21 footer). Not open
  access.
- **PDF:** kept in the study's Drive `Literature` folder as `Blood-Brain Barrier - From Physiology to Disease and Back.pdf`, not in the repo.

## What it gives the study

A review with no method, no micrographs and almost no vessel morphometry. It gives three things:

1. **Vessel types are defined by wall cells, not caliber**, and the endothelium CD31 labels has no
   sharp boundary between them. So CATEGORIZE's caliber split stands in for a cell-type
   distinction a CD31-only stack cannot see, and any caliber threshold is a convention over a
   continuum (METHODS-SYNTHESIS §4.2).
2. **Density moves both ways with condition:** down in Alzheimer's disease and ALS and after
   sensory deprivation, up in Huntington's disease and epilepsy. A group difference in COUNT or
   MEASURE is not rarefaction by default, and more segments can be real angiogenesis rather than
   fragmentation. No effect size is given for any.
3. **Primary sources** that measure capillary length, density and pericyte coverage in mouse
   cortex and hippocampus (below); the review itself does not report their numbers.

**What it does not give,** though a reader might look for it: any vessel diameter or caliber cut,
capillary or length density, segment length, branching statistic, hippocampus-vs-cortex density,
aging effect on vessels, or pericyte-coverage percentage. The text was searched for µm, diameter,
density, length and coverage throughout. For calibers see stefanitsch-2015, pfau-2024 and
blinder-2013; for aging, hill-2020.

## Vessel types by wall cells (the review's Fig. 1 and §I)

| Segment | Mural cells |
|---|---|
| Penetrating arteries | 1–3 layers of smooth muscle cells (SMCs), enveloped by pia |
| Arterioles | a single SMC layer |
| Precapillary arterioles, capillaries, venules (incl. postcapillary) | pericytes |
| Veins, small arteries | SMCs |

- **Zonation** (citing Vanlandewijck 2018, single-cell RNA-seq): endothelial gene expression changes
  *gradually* along the arterio-capillary-venous axis, while mural cells fall into two discrete
  groups, pericytes + venous SMCs vs arterial + arteriolar SMCs. A second channel marking mural
  cells (α-SMA, as Wang 2022 used) would give a real boundary; CD31 alone cannot.
- **Pericytes regulate capillary diameter** (citing Hamilton 2010), so capillary width in fixed
  tissue may depend on pericyte state at fixation. No magnitude is given.
- The Fig. 1 schematic is not to scale and has no scale bar; no caliber can be read off it.

## The one length figure

Human whole brain: ~400 miles of vessel (≈ 640 km, a unit conversion made in this summary),
capillaries **85%** of the length. All three cited sources (Abbott 2010, Pardridge 2015, Zlokovic
2011) are themselves reviews, so the primary measurement is not traceable: order-of-magnitude lore,
human and whole-brain, not a reference value. It agrees in kind with Ji 2021's mouse ~96% of length
in capillaries, which is the number to use.

## Directions of change, by condition

All qualitative in the review:

| Condition | Vessel change stated | Region | Species |
|---|---|---|---|
| Alzheimer's disease | reduced capillary length; reduced pericyte coverage, worse with APOE4 | cortex and hippocampus (coverage) | human |
| GLUT1 haploinsufficiency (*Slc2a1*⁺/⁻) | microvascular regression | brain | mouse |
| Huntington's disease | capillaries-to-arterioles ratio increased; R6/2 mice: increased microvascular density | putamen, cortex, SN; brain | human; mouse |
| Parkinson's with deep brain stimulation | increased capillary length and density vs untreated | subthalamic nucleus | human |
| ALS | reduced microvascular density | brain stem, spinal cord | human |
| Temporal lobe epilepsy | increased microvascular density | hippocampus | human, rodent models |
| Sensory deprivation, postnatal | reduced vascular density | barrel cortex | mouse |

## Primary sources worth fetching

Ranked by fit (mouse, cortex or hippocampus, capillary length or density measured). What each
measured beyond the review's sentence is not in this PDF.

| Ref | Citation | Why |
|---|---|---|
| 59 | Bell RD et al. Pericytes control key neurovascular functions and neuronal phenotype in the adult brain and during brain aging. *Neuron* 68:409–427, 2010. doi:10.1016/j.neuron.2010.09.043 | Mouse, pericyte deficiency **and aging**; the likeliest source of mouse capillary length per region |
| 340 | Lacoste B et al. Sensory-related neural activity regulates the structure of vascular networks in the cerebral cortex. *Neuron* 83:1117–1130, 2014. doi:10.1016/j.neuron.2014.07.034 | Mouse barrel cortex vascular network structure quantified |
| 649 | Winkler EA et al. GLUT1 reductions exacerbate Alzheimer's disease vasculo-neuronal dysfunction and degeneration. *Nat Neurosci* 18:521–530, 2015. doi:10.1038/nn.3966 | Mouse microvascular regression, cortex and hippocampus |
| 319 | Kisler K et al. Pericyte degeneration leads to neurovascular uncoupling and limits oxygen supply to brain. *Nat Neurosci* 20:406–416, 2017. doi:10.1038/nn.4489 | Mouse pericyte loss, in vivo capillary imaging |
| 527 | Sengillo JD et al. Deficiency in mural vascular cells coincides with blood-brain barrier disruption in Alzheimer's disease. *Brain Pathol* 23:303–310, 2013. doi:10.1111/bpa.12004 | Human cortex and hippocampus, pericyte coverage, possibly capillary length |
| 499 | Rigau V et al. Angiogenesis is associated with blood-brain barrier permeability in temporal lobe epilepsy. *Brain* 130:1942–1956, 2007. doi:10.1093/brain/awm118 | Hippocampal microvascular density, human and rodent |
| 610 | Vanlandewijck M et al. A molecular atlas of cell types and zonation in the brain vasculature. *Nature* 554:475–480, 2018. doi:10.1038/nature25739 | Defines arterial/capillary/venous zones molecularly |
| 170 | Farkas E, Luiten PG. Cerebral microvascular pathology in aging and Alzheimer's disease. *Prog Neurobiol* 64:575–611, 2001. doi:10.1016/S0301-0082(00)00068-X | Review of aging microvasculature; a route to aging numbers |
| 232 | Hamilton NB, Attwell D, Hall CN. Pericyte-mediated regulation of capillary diameter. *Front Neuroenergetics* 2:5, 2010. doi:10.3389/fnene.2010.00005 | Capillary diameter control (open access) |

Citations transcribed from the review's reference list.

Left out: BBB development and signalling, junctional proteins, transporters, glymphatic and
lymphatic clearance, disease genetics, BBB imaging and biomarkers, leukocyte trafficking, stroke and
injury time courses, therapeutics, the remaining disease rows (Alzheimer's network renewal,
pericyte-deficient mice, Parkinson's angiogenesis, HIV, CCM, neonatal seizures) and sources (refs 28, 230, 473, 656), and the schematic figures.
