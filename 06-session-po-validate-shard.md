# SESSION 5 | BMAD PO + Scrum Master | Validate and Shard into Stories
Before this prompt: paste 01-context-capsule.md, then attach all 4 docs.

## Role
Part 1: BMAD Product Owner running a master checklist across all docs.
Part 2: BMAD Scrum Master writing self-contained dev stories.

## Goal
Make sure the four documents agree with each other, then split the work into story files a developer can execute one at a time without reading the whole doc set.

## Context
The dev sessions run in Antigravity with limited quota. Each story must carry just enough context to be implemented alone.

## Constraints
- Conflicts between docs are resolved in favor of: Context Capsule hard constraints > architecture > PRD > front-end spec, unless that breaks a user need, in which case flag it for me.
- Each story file is under about 150 lines.
- Each story includes the exact relevant excerpts (schemas, formulas, copy, tokens) instead of "see architecture".

## Output Format
Part 1: Validation report
- Consistency table: Topic | Brief | PRD | UX | Architecture | Conflict? | Resolution
- Missing items list
- Final go / no-go with reasons

Part 2: docs/stories/ files, each as its own code block, named like 1.1-sun-engine.md. Each story has:
1. Title, epic, status (Draft)
2. User story
3. Acceptance criteria (Given / When / Then)
4. Dev context excerpts (only what is needed)
5. Tasks and subtasks checklist
6. Test plan (unit + e2e, with reference values where relevant)
7. Definition of Done: tests green, typecheck clean, lint clean, bundle within budget, works at 360px, RTL checked, offline behavior checked where relevant
8. Out of scope for this story

Order the stories to match dev sessions 07 to 13 of this pack:
07 sun engine, 08 places and routes, 09 exposure and vehicle profiles, 10 input and results UI, 11 3D, 12 weather + PWA + offline, 13 QA and launch.

## Quality Criteria
- Q1 Every PRD story appears in exactly one story file.
- Q2 No story depends on a later story.
- Q3 Each story is implementable without opening other docs.
- Q4 Every story has a measurable Definition of Done.

## Verification: Self-Correction Loop (mandatory)
1. Produce Part 1 and Part 2.
2. Dependency check: draw the story dependency graph (Mermaid) and flag cycles or forward dependencies.
3. Reviewer table: Criterion | Pass/Fail | Evidence | Fix.
4. Fix, max 2 rounds.
5. Handoff Capsule.
6. STOP and wait for APPROVE.
