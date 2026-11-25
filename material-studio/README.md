# Studio 3d · by Smartlabdesign

Interactive material studio with the approved GPU renderer as the default desktop and touch implementation.

Home now collects 11 experiments, with optional All experiments, Materials, Worlds & Dioramas and Product Design filters. Six materials open inside the existing studio. Water Trails, Venice Court, The Villa, Aurelia Bay and Fold 3D open their existing dedicated project pages in a new tab. Linked scenes load no iframe, scene code or WebGL context in Home; previews are compressed static captures of the real projects.

To add a linked experiment, append its title, category, description, URL and preview to `projects` in `assets/gallery.js`. Cards share one size and aspect ratio, stable hover targets and reduced-motion behavior. Home has no horizontal scrolling: the side arrows switch between fixed groups with an opacity fade. Group capacity adapts to available width without reducing the cards to fit the whole collection. Filters sit at the top right on desktop; the footer contains the description and Smartlabdesign link. Add a new material through the existing scene API and performance contract.

- Main tool: https://sites.smartlabdesign.it/material-studio/
- Former desktop v1 URL redirects to the main tool.
- Pre-promotion backup: /material-studio-legacy/

The desktop GPU version was promoted on 2026-11-25 after the user's desktop and iPad comparison. The pre-promotion source is preserved from commit 302406e9d24b2b43f1c936b98ae67aa569186493; the approved GPU variant is the material-studio-desktop-v1 directory at that commit.

New elements must follow the GPU-first performance and visual-quality requirements in AGENTS.md. Desktop keeps the full quality profile, while phone/tablet profiles remain separate. CPU physics and deformation coexist with GPU rasterization, shading, refraction and bloom; the CPU renderer remains a compatibility fallback.

The approved geometry, material settings, physical interactions, sounds and rounded Home transitions are retained.

