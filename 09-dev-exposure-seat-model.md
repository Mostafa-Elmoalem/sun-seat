# SESSION 8 | BMAD Dev | Story: Exposure Engine + Vehicle Profiles
Before this prompt: paste 01-context-capsule.md, then attach docs/architecture.md and the story file for the exposure engine.

## Role
BMAD Dev agent with strong 3D math and computational geometry.

## Goal
Implement the heart of the product: given a route (segments with timestamps), a departure time, and a vehicle profile, compute:
- per-time-step sun vector in the vehicle frame (x = right, y = forward, z = up),
- per-seat exposure score over the trip,
- per-side percentage of trip time with direct sun (left, right, front, back, none),
- a timeline for the UI,
- a verdict object: clear / leaning / tie / doesn't matter / night, with a confidence level from the sensitivity analysis defined in the architecture.

## Context
Egypt drives on the right. In a microbus the sliding door is on the right side and the driver sits on the left. Seat layouts vary; I will confirm the real layout with a photo. Vehicle profiles are JSON data so that a private car or a train can be added later without touching the engine.

## Stack
Pure TypeScript, no DOM. Must be runnable in a Web Worker if the architecture says so.

## Constraints
- Ask me to confirm the microbus seat layout before encoding it: propose the typical 14-passenger Hiace layout as an ASCII diagram and STOP until I confirm or correct it.
- Also create an intercity bus profile (2+2 seating) and mark optional curtains as a profile flag.
- Time step: as defined in the architecture (e.g. 1 minute). Explain the choice if you change it.
- Handle: sun below horizon, sunset during the trip, sun almost straight ahead or behind (windshield / rear), high sun blocked by the roof.
- Results are deterministic for the same inputs.

## Input
Story file, architecture.md, the confirmed seat layout.

## Output Format
Engine module, two vehicle profile JSON files + schema validation, tests, and a "How the exposure model works" section in the README (the owner will explain this in the video, so make it readable).

## Quality Criteria
- Q1 Golden test 1: a straight route heading due north at 8:00 AM Cairo time in June puts the sun on the right side (east), so the verdict recommends the left side.
- Q2 Golden test 2: same route heading due south flips the verdict.
- Q3 Golden test 3: a trip fully at night returns "night" with 0 exposure.
- Q4 Golden test 4: noon in late June near Cairo (sun very high) returns "doesn't matter" or low confidence, per the architecture thresholds.
- Q5 Golden test 5: Cairo to Alexandria in the morning (heading about northwest, sun in the east) recommends the left side. The return trip Alexandria to Cairo in the afternoon (heading about southeast, sun in the west/southwest) ALSO puts the sun on the right, so it also recommends the left side. This is a counter-intuitive result; show the azimuth, heading and relative-angle numbers that prove it.
- Q6 Adding a dummy "private car" profile JSON works with no engine code changes (test proves it).
- Q7 Full calculation for a 4-hour trip completes in < 50 ms in Node (report timing).

## Verification: Dev Self-Correction Loop (mandatory)
If you can run commands (Antigravity / CLI), run them yourself. If you cannot, give me the exact commands, then STOP and wait for me to paste the output.
1. Plan: restate the acceptance criteria as a numbered checklist and list the files you will touch. Wait for nothing, continue.
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
