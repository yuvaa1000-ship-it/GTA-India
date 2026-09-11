# Manual browser control check — 2026-09-11

Production preview on localhost:4173, final UI build (index-B3LUNnhh.js).

- Enter the district clicked successfully; title overlay dismissed.
- Three real browser W key presses moved the HUD coordinate from z=8.0 to z=7.6.
- Save button showed `Saved locally`.
- Return to plaza followed by Load showed `Save restored`.
- After streaming repopulated, visible HUD confirmed z=7.6, 25 cells, 100/50 proxies and 226 rigid bodies. This verifies position restoration, not just a success label.
- Actual 3D scene was inspected visually: capsule, crates, ground/roads, buildings, windows, shadows and proxy motion. This visual inspection supplements executable tests; no screenshot is treated as gameplay proof.
