# SESSION 10 | BMAD Dev | Story: 3D Sun-in-the-Vehicle View
Before this prompt: paste 01-context-capsule.md, then attach docs/architecture.md, docs/front-end-spec.md and the 3D story file.

## Role
BMAD Dev agent: creative front-end engineer experienced with React Three Fiber / three.js on low-end mobile GPUs.

## Goal
A playful, lightweight 3D view of the microbus (and bus) showing how sunlight falls inside the cabin over the trip, driven by the same engine results (no separate math in the UI).

## Context
This is the "wow" moment for the video, but it is optional for the user. It must never slow down the main flow.

## Stack
React Three Fiber / three.js (or the lighter option the architecture chose), lazy-loaded via dynamic import only when the user taps "see it in 3D".

## Constraints
- Low-poly stylised model built from primitives or a tiny glTF (report size). No large textures.
- One directional light driven by the engine sun vector in the vehicle frame, with shadows so sun patches appear on seats.
- Seats coloured by exposure score, same legend as the 2D heatmap.
- Timeline scrubber synced with the 2D timeline; play / pause.
- Camera presets: top view, inside view from the recommended seat, outside orbit. Touch-friendly controls.
- Adaptive quality: lower pixel ratio and shadow map size on weak devices; stop rendering when idle or when the tab is hidden.
- Fallback: if WebGL is unavailable or the chunk fails to load (offline), show a friendly message and keep the 2D view.
- Orientation labels in 3D: "قدام", real "شمال" and "يمين" as seen by a seated passenger.

## Input
Engine result object schema, vehicle profiles, spec.

## Output Format
Lazy 3D module, scene components, tests for the data mapping (engine result -> light direction, seat colours), notes on performance.

## Quality Criteria
- Q1 3D chunk is NOT in the initial bundle (build report proves it); report its gzipped size.
- Q2 Light direction matches the engine: for golden test 1 (heading north, 8 AM June) the sun patches are on the right-side seats.
- Q3 Holds >= 30 fps on a mid-range Android estimate (describe how you measured: DevTools CPU 4x throttle + performance panel).
- Q4 WebGL failure and offline both fall back gracefully (test).
- Q5 No memory leak when opening and closing the view 10 times (dispose geometries, materials, renderer).

## Extra UI verification (before step 6 of the loop)
- Take or describe screenshots at 360x800 and 412x915, in Arabic (RTL) and English (LTR).
- Run Lighthouse mobile (or give me the command) and report Performance, Accessibility, Best Practices.
- Throttle to Slow 3G and report time to a usable result on first and repeat visit.
- Check with a colour-contrast tool that the verdict meets the ratio in front-end-spec.md.
- Confirm the seat map is NOT mirrored in RTL (the real left side of the vehicle is on the left of the diagram, with a label).

## Verification: Dev Self-Correction Loop (mandatory)
If you can run commands (Antigravity / CLI), run them yourself. If you cannot, give me the exact commands, then STOP and wait for me to paste the output.
1. Plan: restate the acceptance criteria as a numbered checklist and list the files you will touch.
2. Tests first: write the failing tests for each acceptance criterion.
3. Implement the smallest code that makes them pass.
4. Run: typecheck, lint, unit tests, build, and the bundle size check. Paste real output, never summarize a run you did not do.
5. If anything fails: diagnose the root cause in 2 to 3 sentences, fix, rerun. Max 3 fix rounds, then stop and report what is blocking.
6. Self-review against the Quality Criteria as a table: Criterion | Pass/Fail | Evidence (file:line or test name) | Fix.
7. Output:
   - Summary of changes (files + one line each)
   - Test and build results
   - Bundle size delta
   - Known gaps / TODOs
   - Handoff Capsule (max 10 bullets) for the DECISIONS LOG
8. STOP. Wait for APPROVE or changes. Do not start the next story on your own.
