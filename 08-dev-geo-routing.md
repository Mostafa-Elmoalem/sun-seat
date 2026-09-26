# SESSION 7 | BMAD Dev | Story: Places, Search and Routes
Before this prompt: paste 01-context-capsule.md, then attach docs/architecture.md and the story file for places and routes.

## Role
BMAD Dev agent, senior TypeScript engineer with GIS basics.

## Goal
1. Build the places dataset (Egyptian cities and main stations) as defined in the architecture, with Arabic formal names, colloquial aliases and English names.
2. Implement Arabic-aware fuzzy search for autocomplete that works fully offline.
3. Build the offline data pipeline script that generates simplified, encoded route files between the configured city pairs, using the routing provider chosen in the architecture.
4. Implement the route adapter: load a route file for a pair, decode it, split it into segments with bearing and distance, and fall back to a great-circle approximation (flagged as approximate) if the file is missing or offline.

## Context
Weak internet. Viral spikes. The route files are static and CDN-cached. The live routing fallback is NOT part of this story unless the architecture puts it here.

## Stack
As in architecture.md.

## Constraints
- Search normalization handles: ا أ إ آ, ة and ه, ى and ي, tashkeel removal, optional "ال", extra spaces, and common spellings (e.g. المحله, المحلة الكبرى, Mahalla).
- Places file size within the architecture budget; report it gzipped.
- Each route file within the per-request budget; report min / median / max sizes.
- The pipeline script is rerunnable, idempotent, rate-limit friendly (delay + retry + resume), and never ships API keys to the client.
- Bearings: 0 = north, clockwise, consistent with the sun engine.

## Input
Story file, architecture.md, and the list of launch city pairs from the DECISIONS LOG.

## Output Format
Dataset files, search module, pipeline script with a README (how to run, how to add a city), route adapter, tests.

## Quality Criteria
- Q1 Search tests: at least 15 queries with messy real-world spellings return the right place in the top 3.
- Q2 Search on the full dataset runs in < 10 ms on a mid-range phone estimate (measure in Node and extrapolate, state the method).
- Q3 Route adapter tests with a known simple path produce correct bearings (e.g. due north = 0, due east = 90).
- Q4 Missing route file and offline both return an approximate route with a flag, never a crash.
- Q5 Pipeline dry-run on 3 pairs works end to end.

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
