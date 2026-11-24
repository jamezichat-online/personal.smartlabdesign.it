# Material Studio 3D — Desktop GPU v1

Independent comparison variant based on commit 161ffbe2f91c0fbe7122682563b7fad5edde1657.

- Original: https://sites.smartlabdesign.it/material-studio/
- Desktop GPU v1: https://sites.smartlabdesign.it/material-studio-desktop-v1/

The desktop profile retains the original full-density meshes, 650,000-pixel raster budget, 1.45 maximum pixel ratio, full-resolution shadow maps and per-pixel ground-shadow sampling. Geometry and physics remain in JavaScript; surface rasterization, thickness-based jelly transmission/refraction and bloom run in WebGL 2. Texture anisotropy is capped at 8x or the device limit. Desktop bloom uses a 25-tap Gaussian kernel. Existing native GPU paths for citrus and cloud are retained.

A visible GPU status and a link to the original support side-by-side comparison. If WebGL 2 is unavailable, the existing software renderer remains available. Touch devices retain the mobile quality profile.

The variant is a source-and-asset snapshot. Publishing it does not modify or replace the original. Promotion to the main version requires a separate decision after visual and performance comparison on the target desktop.

Validation: shader compilation/linking and recorded rendering commands replayed in an OpenGL ES 3 context for all four mesh materials; full desktop mesh counts and framebuffer sizes checked; picking, deformation, release and suspend/resume exercised. These checks do not establish FPS on the user's desktop or visual identity on every browser.
