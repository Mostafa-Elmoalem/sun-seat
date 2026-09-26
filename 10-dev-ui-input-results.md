# SESSION 9 | BMAD Dev | Story: Trip Input + Results UI
Before this prompt: paste 01-context-capsule.md, then attach docs/front-end-spec.md, docs/architecture.md and the story file(s) for the UI.

## Role
BMAD Dev agent: senior React engineer with a strong eye for mobile UX, RTL and performance on low-end Android.

## Goal
Build the two screens that ARE the product:
1. Trip input: origin and destination autocomplete (offline search from session 7), swap button, date (default today), departure time (default now rounded to 5 minutes), vehicle chips (ميكروباص / أتوبيس), recent trips.
2. Results: verdict hero first, then side percentages bar, seat heatmap, sun timeline scrubber, the one-line "why" geography explanation, share button, and a "see it in 3D" button (the 3D itself is session 10).

## Context
The user is at a station in the sun with one hand and weak data. The verdict must be visible without scrolling at 360x800.

## Stack
As in architecture.md. Tokens and copy from front-end-spec.md, exactly.

## Constraints
- All calculation happens on device (Web Worker if the architecture says so). The UI never blocks.
- Every component implements loading, empty, error, offline and slow-network states from the spec.
- Touch targets >= 48 px. Primary action in the thumb zone.
- Seat heatmap and any vehicle drawing use a fixed orientation container (direction: ltr inside, front at top) with clear Arabic labels for real left and right.
- Colour is never the only carrier of meaning in the heatmap (add icons or percentages).
- URL reflects the trip (so it can be shared and reopened), without personal data.
- No new heavy dependencies. Report the bundle delta.

## Input
Spec, architecture, story files, and the engine modules from sessions 6 to 8.

## Output Format
Components, pages, hooks, tests (unit + one Playwright e2e for the core flow with network throttled), and screenshots or descriptions.

## Quality Criteria
- Q1 New trip in <= 6 taps, repeat trip in <= 3 taps (e2e test proves it).
- Q2 Verdict above the fold at 360x800 in both languages.
- Q3 Each honest-output verdict (clear, leaning, tie, doesn't matter, night) has a rendered state and a test.
- Q4 Lighthouse mobile Accessibility >= 95, Performance >= 90.
- Q5 Initial JS remains within the budget in the Context Capsule.
- Q6 Opening a shared URL reproduces the same result.

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
