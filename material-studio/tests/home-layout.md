# Home controls regression

Reproduction on the previous layout at 2048×1019: the gallery rail began at y=232.55 while the header ended at y=261.68, and the gallery ended at y=934.98 while the footer began at y=905.84. A physical pointer click on Materials at (456,245) did nothing because the rail covered it. Accessibility button activation did not expose this failure.

For each viewport (2048×1019, 1280×720, 1024×768, 390×844):

1. Compare rendered bounds: rail.top >= header.bottom and rail.bottom <= footer.top.
2. Feature Citrus. Its title and description must remain within the gallery row and outside the controls.
3. Click the visible center of each filter using pointer coordinates; check the selected state and card count (11 / 6 / 4 / 1).
4. On All experiments, click the forward arrow with the pointer and verify the rail scroll offset increases.
5. Open a material, return Home, and repeat the filter clicks.

The controls now live in the footer. Card size derives from the gallery's available height, and the gallery forms an isolated stacking context. Keep these conditions when adding experiments or changing typography.
