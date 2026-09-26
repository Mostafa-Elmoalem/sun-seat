# SESSION 11 | BMAD Dev | Story: Weather + PWA + Offline + Weak Network
Before this prompt: paste 01-context-capsule.md, then attach docs/architecture.md and the relevant story files.

## Role
BMAD Dev agent: offline-first / PWA specialist who has shipped to users on unstable 3G.

## Goal
1. Optional weather: fetch hourly cloud cover (and UV index if useful) from Open-Meteo for the trip window and apply it as the multiplier defined in the architecture. Show "الجو غيم، الموضوع مش فارق أوي" style messages from the copy deck.
2. PWA: manifest (Arabic name, icons, theme colour), installable, service worker with the caching strategy from the architecture.
3. Offline and weak-network behaviour across the whole app.

## Context
Egyptian mobile data is slow, sometimes drops, and costs money. Users often open the app for the second time exactly when the signal is worst: at the station.

## Stack
As in architecture.md (e.g. Workbox or a small hand-written service worker, justify by size).

## Constraints
- Weather request: timeout (e.g. 3 s), never blocks the verdict, result updates in place if it arrives later, cached per location and hour.
- Precache: app shell, places dataset, vehicle profiles, fonts (if any).
- Runtime cache: route files (stale-while-revalidate), weather (network-first with short timeout).
- Storage budget and eviction policy; recent trips remembered locally (no server).
- Update flow: new version available -> non-intrusive prompt, never mid-calculation.
- Respect Save-Data and navigator.connection hints if available: skip weather and 3D preloading.
- Clear offline indicator in the UI using copy from the spec.

## Input
Architecture, spec, current codebase.

## Output Format
Service worker, manifest, weather adapter, network-status hook, tests, and a "Weak network test report".

## Quality Criteria
- Q1 After one visit, airplane mode -> open app -> choose a cached pair -> verdict appears.
- Q2 Airplane mode with an uncached pair -> approximate result with a clear "تقريبي" warning, no crash.
- Q3 Weather API down or slow -> verdict still appears within the normal time; test simulates it.
- Q4 Slow 3G first visit meets the time budget in the Context Capsule; repeat visit <= 1.5 s.
- Q5 Lighthouse PWA / installability checks pass.
- Q6 Save-Data mode skips weather and never preloads 3D (test).

## Weak Network Test Report (include in output)
Scenario | Network profile | Expected | Actual | Pass/Fail
Cover: first visit Slow 3G, repeat visit offline, flaky network (requests fail 50% of the time), weather timeout, route file 404, new deploy while user is offline.

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
