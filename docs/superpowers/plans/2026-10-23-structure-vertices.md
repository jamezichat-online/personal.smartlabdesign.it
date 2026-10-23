# Garage and canopy footprint editing

User request: change garage and canopy shape by moving vertices. Reuse the existing exterior editor style and saved project/undo transactions. No new dependency.

1. Persist validated footprint records (9 garage outline vertices, 5 canopy vertices), preserving default v3.20 geometry. Rebuild garage walls, roof terrace, stairs, railings, drainage/front doors and adjoining ramp from those anchors. Rebuild canopy roof, beams and supports from its footprint.
2. Add Exterior > Perimetri with structure selector, draggable plan vertices, numeric coordinates, Apply, Undo and Reset. 3D geometry previews update during drag, without rebuilding the whole estate. Save once per release; cancel restores original geometry. Invalid, crossed/out-of-property contours are rejected with a visible message. Preserve camera/view while committing.
3. Verify real pointer editing, geometry changes, invalid input rollback, undo/reset and export/import. Check default garage access regression and catalog compatibility; review code and publish authorized update.

Canopy transforms are folded into the current world-space draft when edited, including vertical translation/scale; clearing that native transform on commit avoids double application. Garage structural edits supersede separate transforms/shapes of its constituent native walls/rail/gate, with Undo preserving prior project state. Other furniture and landscape state remain intact.

Boundary ruling: canopy validation allows only the union of the currently clipped lot and the exact original canopy outline, which partly predates that clipping. Test every edge interval at boundary crossings, preserving the original footprint without allowing new expansion outside those regions. Garage remains constrained to the current lot.

Latest user steering: live geometry changes are required during pointer movement, both in the plan and directly in 3D. Keep updates local to cloned selected-structure geometry, then rebuild/save once on release. Regenerate surface triangulation, roof slope and surface UVs using the same formulas as the final build.
