# Home controls regression

Reproduction on the previous layout at 2048×1019: the gallery rail began at y=232.55 while the header ended at y=261.68, and the gallery ended at y=934.98 while the footer began at y=905.84. A physical pointer click on Materials at (456,245) did nothing because the rail covered it. Accessibility button activation did not expose this failure.

For each viewport (2048×1019, 1280×720, 1024×768, 390×844):

1. Compare rendered bounds: rail.top >= header.bottom and rail.bottom <= footer.top.
2. Feature Citrus. Its title and description must remain within the gallery row and outside the controls.
3. Click the visible center of each filter using pointer coordinates; check selected state and total experiment count (11 / 6 / 4 / 1). Only the current group is rendered.
4. On All experiments, click the side arrow with the pointer and verify the card group changes while scrollLeft remains zero and scrollWidth equals clientWidth. Check every experiment is reachable. Arrow bounds must be exactly 48×48 px.
5. Open a material, return Home, and repeat the filter clicks.

Filters sit at the top right on desktop; 48×48 px arrows occupy the gallery sides with no full-width pointer interception. The footer contains the description and Smartlabdesign link. Cards retain the original 294×350 px geometry at 2048×1019, with adaptive group capacity rather than horizontal scrolling. At narrow widths, test returning Home after selecting another material in the scene navigation: the correct material's group must be visible. Keep the disjoint rows and isolated stacking context when adding experiments or changing typography.
