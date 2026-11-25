# Material Studio 3D — project instructions

## Active version and sources
- The canonical tool is `/material-studio/`. The GPU implementation was approved as definitive on 2026-11-25.
- `/material-studio-desktop-v1/` is a redirect to the canonical tool. Do not develop a second implementation there.
- `/material-studio-legacy/` is the pre-promotion backup. Leave this snapshot intact unless the user asks to restore or edit it.
- Main scene/physics code: `index.html`. Shared mesh GPU renderer: `assets/desktop-raster.js`. Home/transitions: `assets/gallery.js` and `assets/gallery.css`.

## Rendering and performance contract
- Every new material must follow the GPU-first architecture already approved by the user, on desktop and touch devices.
- Mesh rasterization, material shading, thickness/refraction and bloom belong in the shared WebGL 2 renderer. Citrus and cloud already have native GPU paths; preserve those.
- Keep the software rasterizer as a compatibility fallback, not the primary path for new elements.
- CPU physics, mesh deformation and input handling are allowed. Do not introduce new JavaScript per-pixel shading loops or full-frame GPU-to-CPU readbacks into the normal GPU path.
- Batch mesh drawing by material, reuse GPU buffers/textures, and avoid a new WebGL context per object.
- Keep desktop and touch quality profiles separate via `materialPerformance` and `desktopQuality`. Preserve full desktop geometry, resolution, shadow precision and anisotropic filtering unless the user requests a change. Keep the established lighter phone/tablet profiles.
- Preserve transmission, reflection, surface wetness, lighting tied to the scene, dynamic contact/cast shadows, and the material-specific physical response. Performance improvements must not silently replace these with static visual shortcuts.
- Render on demand where possible. Pause rendering/simulation when hidden and during Home transitions. Do not create duplicate animation loops.
- Measure event responsiveness and CPU/GPU workload as well as frame rate. Report actual test scope; local renderer checks are not device FPS measurements.

## Adding elements and interaction
- Integrate new elements with the shared scene API, title/navigation data, Home gallery, previews, contextual backgrounds, lighting, interaction hints and existing audio/credits workflow.
- Home cards remain uniform and accommodate additional elements. Hover uses stable rail targets; transitions should use transform/opacity rather than animated layout dimensions.
- Keep rounded clipping throughout opening and returning Home, including temporary flight cards, preview images and captured canvases.
- Keep UI copy in English.
- Verify material selection, deformation/release, picking of separable pieces, reset, Home transitions and suspend/resume for the affected paths.

