# SESSION 6 | BMAD Dev | Story: Sun Engine + Project Foundation
Before this prompt: paste 01-context-capsule.md, then attach docs/architecture.md and the story file for the sun engine.

## Role
You are the BMAD Dev agent: a senior TypeScript engineer who writes small, well-tested, dependency-light code. You follow the story exactly and do not expand scope.

## Goal
1. Scaffold the project with the stack chosen in architecture.md (TypeScript strict, lint, format, Vitest, size-limit or equivalent, folder structure from the architecture).
2. Implement the pure sun engine module: given a UTC instant and lat/lng, return sun azimuth (degrees clockwise from north) and elevation (degrees).
3. Implement time helpers that convert a local date + time in Africa/Cairo to UTC correctly, including DST transitions.

## Context
The engine has no DOM dependency and will be reused later for other vehicles and possibly a native app.

## Stack
As decided in architecture.md. Do not add libraries not listed there without asking.

## Constraints
- Pure functions, no global state.
- Angles: document units and conventions at the top of the module. Azimuth 0 = north, 90 = east.
- Accuracy target: within 1 degree of the NOAA Solar Calculator.
- Keep the module small; report its minified + gzipped size.

## Input
The story file and architecture.md.

## Output Format
Code files + tests + a short README section "Sun engine conventions".

## Quality Criteria
- Q1 Reference tests: at least 6 cases for Cairo (30.04 N, 31.24 E) and one for Aswan (24.09 N, 32.90 E), covering winter solstice, summer solstice, an equinox, sunrise, noon and late afternoon. Get reference values from the NOAA Solar Calculator; if you cannot access it, give me the exact list of inputs and STOP so I can fetch the values.
- Q2 DST tests: a local time the day before and the day after Egypt's DST start and end converts to the correct UTC instant. Use Intl data rather than hardcoded offsets.
- Q3 Night returns negative elevation and is handled without errors.
- Q4 100% branch coverage on the engine module.
- Q5 No DOM, no Date.now() inside pure functions (time is always injected).

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
