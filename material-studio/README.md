# Material Studio 3D

Interactive material studio with the approved GPU renderer as the default desktop and touch implementation.

- Main tool: https://sites.smartlabdesign.it/material-studio/
- Former desktop v1 URL redirects to the main tool.
- Pre-promotion backup: /material-studio-legacy/

The desktop GPU version was promoted on 2026-11-25 after the user's desktop and iPad comparison. The pre-promotion source is preserved from commit 302406e9d24b2b43f1c936b98ae67aa569186493; the approved GPU variant is the material-studio-desktop-v1 directory at that commit.

New elements must follow the GPU-first performance and visual-quality requirements in AGENTS.md. Desktop keeps the full quality profile, while phone/tablet profiles remain separate. CPU physics and deformation coexist with GPU rasterization, shading, refraction and bloom; the CPU renderer remains a compatibility fallback.

The approved geometry, material settings, physical interactions, sounds and rounded Home transitions are retained.

