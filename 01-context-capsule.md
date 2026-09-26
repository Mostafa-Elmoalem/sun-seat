# PROJECT CONTEXT CAPSULE
Paste this at the top of EVERY session. Update the DECISIONS LOG after each session.

## Project
- Name: [PROJECT_NAME]
- One-liner: A mobile-first web app that tells public-transport riders in Egypt which side and which seat of a microbus or bus will get the least sun for a specific trip, date and departure time.
- Owner: Mostafa, software engineer (React / Next.js, UI/UX), based in Egypt.
- Launch vehicle: a humorous YouTube/social video titled around "What is geography even good for?" where the owner presents the app. Expect traffic spikes right after publishing.

## Target users
- University and school-age students who commute between governorates.
- Daily commuters who depend on microbuses and intercity buses.
- They use the app standing at a microbus station (موقف), on a mid-range Android phone, often in direct sunlight, one hand busy, on weak or expensive mobile data.

## Hard constraints (never violate)
1. Mobile-first. Design for 360x800 first, then scale up.
2. Weak internet in Egypt: the core answer must work on Slow 3G and should work offline after first visit.
3. Arabic first (RTL, Egyptian colloquial copy), English secondary.
4. Sun position is computed on-device (astronomical algorithm). No API for sun position.
5. All times use the IANA zone Africa/Cairo (Egypt observes DST). Never hardcode UTC+2.
6. Vehicle diagrams and seat maps are NEVER mirrored by RTL layout. Front of vehicle at top, real left is left.
7. The engine is vehicle-agnostic. Vehicles are data profiles (microbus, bus now; private car, train later).
8. Honest output: when the answer is uncertain or the side does not matter (sun high overhead, night, overcast), say so plainly.
9. No user accounts, no storing location. Privacy by default.
10. Free or near-free to run, and must survive a viral spike (static assets + CDN first).

## Default technical direction (Architect may revise with justification)
- Frontend: React (Next.js static export or Vite, Architect decides by bundle size), TypeScript strict.
- Hosting: Netlify (owner already uses it) + CDN-cached static JSON.
- Sun: SunCalc-style / NOAA algorithm, pure TS module.
- Places: bundled JSON of Egyptian cities and major stations with Arabic, colloquial and English names.
- Routes: precomputed simplified polylines between major city pairs (built offline from OpenStreetMap via OSRM or OpenRouteService), fetched per pair on demand. Live routing is a later fallback behind a serverless proxy with caching.
- Weather: Open-Meteo (no key), optional, never blocking.
- 3D: React Three Fiber / three.js, lazy-loaded only on user request.
- PWA: service worker, offline shell, cached places and recent routes.

## Performance budget (targets)
- Initial JS <= 120 KB gzipped, first load total <= 300 KB.
- Data per new trip search <= 30 KB.
- Usable result on Chrome DevTools "Slow 3G" in <= 6 s on first visit, <= 1.5 s on repeat visit.
- 3D chunk loaded only on demand.

## BMAD workflow in this project
Analyst -> Project Brief -> PM -> PRD -> UX Expert -> Front-end Spec -> Architect -> Architecture -> PO validation + sharding -> SM stories -> Dev (story by story) -> QA review.
All artifacts live in /docs. Stories live in /docs/stories.

## Prompt schema used in every session
Role, Goal, Context, Stack, Constraints, Input, Output Format, Quality Criteria, Verification (Self-Correction Loop).

## DECISIONS LOG (append after each session)
### Session 1 | BMAD Analyst (2026-09-25)
- **Scope - Vehicles**: MVP focuses strictly on 14-seater microbus (Toyota HiAce standard layout) and intercity bus (SuperJet / GoBus). Trains, private cars, and intra-city taxis deferred to post-MVP.
- **Scope - Routes**: Major Egyptian intercity pairs (Cairo ↔ Alexandria, Delta hubs, Suez Canal cities, Upper Egypt) + major long-distance corridors inside Greater Cairo (Ring Road, October, New Cairo).
- **Core Engine**: Pure client-side astronomical calculation in TypeScript (zero external API, zero runtime cost, fully offline capable).
- **Route Data Architecture**: Precomputed simplified polyline JSON files (under 30KB per route corridor) hosted statically on CDN to withstand viral traffic spikes without API rate limit bottlenecks.
- **Primary Screen UI**: Highly interactive 2D cross-section & top-view seat layout. Clear immediate banner: "اقعد شمال" or "اقعد يمين" with shade percentage.
- **Tone of Voice**: Modern Egyptian colloquial, witty, light humor, fast and functional (not overly silly or obstructive).
- **Educational / Astronomy Angle**: Visual spherical sun trajectory representation around the vehicle with an optional "شوف حسبناها إزاي" drawer explaining the solar azimuth & elevation.
- **Honest Output Policy**: If the sun is at high noon zenith overhead where the vehicle roof provides shade and side doesn't matter, explicitly state that neither side makes a difference.
- **Curtains & Tint Baseline**: Assumed zero curtains / completely clear windows as a worst-case baseline.
- **Creator & Success Metrics**: Primary creator milestone is launching the YouTube video and gaining confidence on camera; technical target is 100% uptime with zero cost and <2s 3G initial load.

### Session 2 | BMAD PM (2026-09-25)
- **PRD Architecture**: Structured into 7 Epics and 13 discrete user stories with Given/When/Then ACs and 100% traceability.
- **Visual Design Standard (Owner Directive)**: Low bandwidth and high performance do NOT mean plain or austere UI. The design must be world-class, ultra-modern ("تطبيق فشيخ"), sleek, with fluid 60fps micro-interactions, spring animations, and premium typography.
- **3D Interactive Experience**: The 3D model of the vehicle and orbiting sun is a flagship visual feature with real-time lighting and shadows, architected with progressive loading/streaming (Draco/Meshopt < 100KB) to ensure the 120KB initial JS bundle and instant critical path remain unblocked.
- **Honest Output Metrics**: Explicit states defined for Night (elevation < 0°), High Noon (> 68° elevation for >= 70% duration), and Tie (< 10% diff).
- **Sensitivity & Confidence**: Parallel evaluation of ±30 min departure time and ±20% speed margin to calculate confidence level.
- **RTL Integrity**: Hard rule: Vehicle diagrams, seat maps, and 3D scenes are strictly exempt from RTL mirroring (real left is left).
- **PWA & Offline**: Complete offline usability after first visit for cached routes and full place autocomplete.

### Session 3 | BMAD UX Expert (2026-09-25)
- **App Name / Branding**: Adopted "اقعد فين؟" as the primary user-facing brand identity and logo.
- **Visual Design Identity**: Hybrid Modern Bento Grid with tactile glassmorphic surfaces, subtle depth, and solar-to-sky palette (Amber #F59E0B vs Sky Azure #0EA5E9).
- **Outdoor Sunlight Readability**: Hero verdict displayed in 36px bold text with 14.8:1 contrast ratio against white cards (surpassing WCAG AAA 7:1 requirement).
- **Ergonomics & Thumb Zone**: All primary inputs and CTAs placed in the bottom 400px thumb zone; minimum 48×48px touch targets throughout.
- **Interaction Tap Budget**: 4 taps for new trip calculation; 2 taps for repeat trip from local recent searches.
- **Dual Representation & 3D Centerpiece**: Fluid switcher between 2.5D tactile seat heatmap and an interactive 3D WebGL vehicle with real-time solar orbit and directional shadows.
- **Interactive Solar Scrubber**: Real-time 60fps scrubber slider allowing users to advance trip time and watch celestial sun movement and seat shadow coverage update live.
- **RTL Physical Integrity Guard**: Vehicle diagrams and 3D scenes strictly un-mirrored with explicit colloquial badge: "شمالك وإنت راكب وباصص لقدام".
- **Egyptian Colloquial Copy Deck**: Friendly, conversational, witty copy established for all verdict states, edge cases, and empty/offline banners.
- **On-Device Social Share**: Dual format export (1080x1920 Story and 1200x630 Feed/WhatsApp) generated client-side via Canvas/SVG.

### Session 4 | BMAD Architect (2026-09-25)
- **Framework & Build Stack**: Vite + React 19 + TypeScript (Strict) + Tailwind CSS v4 + Zustand. Initial critical-path bundle calculated at ~91.7 KB gzipped (well below 120 KB limit).
- **Hexagonal Architecture**: `src/core` houses pure DOM-free TypeScript modules for astronomy, geometry, and exposure math; `src/adapters` handles static JSONs, caching, and Open-Meteo; `src/ui` houses React components and lazy 3D chunks.
- **Sun Algorithm**: Custom pure TS NOAA solar position implementation (~1.5 KB, < 0.05° error, zero dependencies).
- **Timezone Handling**: Native `Intl.DateTimeFormat` with `timeZone: 'Africa/Cairo'` (0 KB cost, automatic DST compliance).
- **Routing Strategy**: Precomputed Douglas-Peucker simplified & polyline-encoded JSON files (< 20 KB per pair) on Netlify CDN, with Great Circle straight-line bearing fallback when offline/missing.
- **3D Engine Isolation**: Three.js + React Three Fiber isolated in a dynamic lazy chunk (`src/ui/three/`) with Meshopt/Draco compressed GLB models (< 80 KB), keeping initial load 0 KB for 3D.
- **Viral Spike Economics**: 100k visits consume ~10.7 GB bandwidth on Netlify Starter (100 GB free tier) = $0.00 total cost and zero API rate limits.

### Session 5 | BMAD PO + Scrum Master (2026-09-25)
- **Master Consistency Sign-off**: 100% agreement verified across Brief, PRD, Front-End Spec, and Architecture with zero unresolved conflicts.
- **Story Sharding**: Decomposed implementation into 14 discrete, self-contained story files in `docs/stories/`, each under 150 lines with full math/schemas/tasks.
- **Hybrid Places & Search**: Approved searching by general Egyptian neighborhoods (Dokki, Heliopolis, Maadi, etc.) + GPS location, backed by local ~350-place JSON (<25KB) + OpenStreetMap Photon fallback.
- **Hybrid Routing**: Precomputed JSON on CDN for top routes + free OSRM live routing for custom neighborhood-to-neighborhood trips with browser caching.
- **Dependency Graph**: Strictly acyclic, zero forward dependencies. Ready for development session by session.

### Session 6 | BMAD Dev - Sun Engine (2026-09-25)
- **Project Foundation**: Scaffolded with Vite + React 19 + TypeScript Strict + Vitest + Tailwind.
- **NOAA Sun Engine**: Completed `src/core/astronomy/noaa-solar.ts` (1.24 KB gzipped, <0.05° NOAA error, zero dependencies).
- **Cairo Timezone**: Completed `src/core/astronomy/timezone.ts` utilizing native `Intl` for `Africa/Cairo` with verified DST transitions.
- **Honest Rules Evaluator**: Completed `src/core/exposure/honest-rules.ts` covering night, high overhead midday sun, and ties.
- **Testing Verification**: 23 unit tests passing in <600ms with >98% branch coverage.

### Session 7 | BMAD Dev - Places, Search & Routes (2026-09-25)
- **Places Dataset**: Built `public/data/places.json` containing 30 Egyptian hubs (stations, major cities, and Greater Cairo districts like Dokki, Heliopolis, Tagamoa, October, Mahalla) weighing 11.1 KB raw / 2.31 KB gzipped (well under 15 KB budget).
- **Arabic Fuzzy Autocomplete**: Implemented `src/core/geometry/normalize-arabic.ts` handling Alef variants (أ,إ,آ,ٱ), Teh Marbuta (ة/ه), Alef Maqsura (ى/ي), Tashkeel/Tatweel stripping, optional 'ال' prefix, and Eastern Arabic numerals (٠-٩).
- **Sub-Millisecond Search**: Implemented `src/adapters/places-repository.ts` achieving benchmarked search latency < 0.6 ms per query in Node (~2 ms extrapolated on low-end mobile), with instant empty-state popular chips and GPS nearest location matching.
- **Polyline & Bearing Engine**: Implemented `src/core/geometry/bearing.ts` and `polyline-decoder.ts` with lossless Google polyline encoding/decoding and Haversine great circle calculations.
- **Multi-Tier Route Adapter**: Implemented `src/adapters/routes-repository.ts` with in-memory caching, static precomputed JSON fetching, and fallback to multi-segment Great Circle approximation (`isApproximate: true`) when offline or route missing.
- **Proportional Segment Durations**: Scaled individual polyline segment travel durations proportionally based on actual segment distances ensuring segment durations accurately sum to total car duration.
- **Precompute Pipeline**: Built `scripts/precompute-routes.ts` with `--dry-run` and `--limit` support, polite rate-limiting, exponential backoff, and idempotent file skipping. Precomputed routes for launch corridors (318B to 599B each).
- **Production Build & Verification**: 58 Vitest unit tests passing (100% pass rate). Production bundle is 69.64 KB gzipped (within 120 KB budget).

### Session 8 | BMAD Dev - Exposure Engine & Vehicle Profiles (2026-09-25)
- **Confirmed Microbus Layout**: Owner confirmed the 14-passenger Toyota HiAce layout: 2 passengers in front row next to driver (`seats 1-2`) + 3 middle rows of 3 seats each (`seats 3-11`, left window, middle, right folding jump seat) + 3-seat rear bench (`seats 12-14`). Encoded in `public/data/vehicles/microbus-14.json`.
- **Intercity Bus Layout**: Built `public/data/vehicles/bus-49.json` with 2+2 seating (11 rows of 4 + 5-seat back row = 49 seats) and `hasCurtains: true` profile flag.
- **Schema & Extensibility**: Implemented `src/core/vehicles/vehicle-repository.ts` with strict runtime validation (`validateVehicleProfile`), enabling zero-code addition of custom vehicles (e.g., private car).
- **3D Ray-Window-Roof Engine**: Implemented `src/core/exposure/exposure-calculator.ts` transforming solar azimuth/elevation into vehicle coordinates ($+x$ right, $-x$ left, $+y$ forward, $+z$ up) at 1-minute steps.
- **Sensitivity & Confidence**: Automated 4 perturbation passes ($\pm 30\text{ min}$ departure time, $\pm 20\%$ speed) classifying verdicts into `HIGH`, `MEDIUM`, or `LOW` confidence.
- **Performance Optimization**: Cached `Intl.DateTimeFormat` singletons in `timezone.ts` and grouped window bounding boxes by side; full 4-hour trip (240 min + 4 sensitivity passes = 1,200 steps) executes in **9 ms** (target < 50 ms).
- **Bundle & Tests**: 69 unit tests across 7 test suites passing 100% (including Golden Tests Q1–Q7 and the Cairo-Alexandria round-trip paradox). Total production bundle is **72.24 KB gzipped** (+2.60 KB delta).

### Session 10 | BMAD Dev - Trip Input + Results UI (Stories 4.1, 4.2, 4.3) (2026-09-25)
- **Modern Bento Design System**: Implemented `src/ui/styles/tokens.ts` and `src/ui/styles/index.css` (1.80 KB gzipped) with Light Alabaster (`#F8FAFC`) canvas, pure white Bento cards (`#FFFFFF`), and `17.45:1` primary text contrast (`#0F172A`), surpassing the `14.8:1` outdoor sunlight spec and WCAG AAA (`7:1`).
- **Bilingual Copy Deck**: Implemented `src/ui/i18n/copy.ts` with full Egyptian colloquial Arabic (`dir="rtl"`) and English (`dir="ltr"`) copy and instant language switching.
- **Zustand Trip Store & URL Sync**: Implemented `src/ui/store/trip-store.ts` with automatic `Africa/Cairo` 5-minute time rounding, `+30m` / `+1h` quick chips, animated origin/destination swap, `localStorage` recent trip chips, and privacy-safe URL query synchronization (`?from=...&to=...&v=...&t=...`).
- **Fast Thumb-Zone Input UI (Story 4.1)**: Built `StationAutocomplete.tsx`, `TimeSelector.tsx`, and `HomeView.tsx` achieving $\le 4$ taps for a new trip and $\le 2$ taps for a repeat trip from recent chips, with all interactive targets $\ge 48\times 48\text{ px}$ (`56\text{px}` primary CTA).
- **Hero Verdict & 2.5D Tactile Seat Heatmap (Story 4.2)**: Built `HeroVerdictCard.tsx` (rendering all 5 honest-output verdicts above the fold at `360x800`) and `SeatHeatmap2D.tsx` with strict `dir="ltr"` physical orientation lock, non-color-alone icons (`🛡️`/`☀️`/`🏆`) + percentages, and tactile seat detail cards for both `microbus-14` and `bus-49`.
- **60fps Solar Time Scrubber & Educational Drawer (Story 4.3)**: Built `SolarTimeScrubber.tsx` with real-time (<0.2ms/step) instantaneous seat exposure updates and mid-trip sun flip detection, plus `EducationalDrawer.tsx` with an SVG solar compass/trajectory diagram, sensitivity scenarios table, and YouTube link.
- **Bundle & Verification**: 84 tests across 10 test suites passing 100% in 1.48s. Production JS bundle is **94.94 KB gzipped** (+22.70 KB delta) + **1.80 KB gzipped CSS** = **97.21 KB total gzipped** (well under the 120 KB JS / 300 KB total budget).

### Session 11 | BMAD Dev - Interactive 3D Vehicle & Solar Orbit View (Story 6.1) (2026-09-26)
- **Lazy Chunk Isolation (Q1)**: Isolated the 3D scene in `src/ui/three/VehicleCanvas.tsx` via `React.lazy()`, producing a separate on-demand chunk (`VehicleCanvas-*.js` weighing **5.33 KB gzipped**) that is never downloaded on the initial critical path.
- **Compact Low-Poly GLB Assets**: Built `scripts/generate-glb-models.ts` and generated standards-compliant glTF 2.0 binary models `public/models/microbus-14.glb` (**1.51 KB**) and `public/models/bus-49.glb` (**3.02 KB**), well below the 80 KB budget.
- **Engine-Driven 3D Lighting & Sun Patches (Q2)**: Built `src/ui/three/SunOrbitScene.ts` and `src/ui/three/VehicleModel.ts` consuming `calculateSunVector` directly from `src/core/exposure/exposure-calculator.ts` (zero duplicate astronomy math), verified against Golden Test 1 (North at 8 AM June casts sun patches onto right-side seats).
- **Camera Presets & Timeline Play/Pause**: Added 3 touch-friendly camera presets (`Orbit 360°`, `Top View`, `Inside Recommended Seat`), 1-finger touch orbit controls, 3D physical orientation labels (`"▲ قدام (السائق)"`, `"◀ شمال"`, `"يمين ▶"`), and Play/Pause animation synced with the 2D solar timeline scrubber.
- **Adaptive Quality, Fallback & Zero Memory Leaks (Q3, Q4, Q5)**: Implemented adaptive pixel ratio and shadow resolution for low-end mobile GPUs, automatic render-loop pause when idle or `document.hidden`, graceful WebGL/offline fallback (`ThreeChunkErrorBoundary`), and deterministic GPU resource disposal verified across 10 mount/unmount cycles.
- **Bundle & Tests**: 90 tests across 11 test suites passing 100%. Initial JS bundle is **95.87 KB gzipped** (+0.93 KB delta for lazy boundary); lazy 3D chunk is **5.33 KB gzipped**.

### Session 12 | BMAD Dev - Weather Adapter, PWA Offline, Weak Network & Share Card (Stories 5.1, 5.2, 7.1) (2026-09-26)
- **Non-Blocking Weather Adapter (Story 5.2)**: Implemented `src/adapters/weather-service.ts` calling Open-Meteo (`cloudcover`, `uv_index`) asynchronously after `verdict` is rendered, with a strict `1500ms` timeout (`AbortController` + `Promise.race`), 30-minute location+hour caching, and colloquial Arabic badge formatting in `src/ui/components/WeatherBadge.tsx`.
- **Save-Data & 2G Guards (Q6)**: Implemented `shouldSkipNetworkExtras()` and `src/ui/hooks/use-network-status.ts` respecting `navigator.connection.saveData` and `effectiveType === '2g' | 'slow-2g'` to skip background weather calls on weak/metered Egyptian mobile data.
- **PWA & Offline First (Story 5.1)**: Created `public/manifest.webmanifest` (`display: standalone`, `dir: rtl`, `lang: ar-EG`), `public/favicon.svg`, `public/sw.js` (precaching app shell + `places.json` + vehicle profiles; Stale-While-Revalidate for `/data/routes/*.json` with 50-entry eviction), and `src/adapters/pwa-register.ts` with a non-intrusive `SKIP_WAITING` update toast in `App.tsx`.
- **On-Device Dual-Format Share Card (Story 7.1)**: Implemented `src/ui/components/ShareModal.tsx` using pure Native HTML5 2D Canvas (zero external libraries) supporting both `1080x1920` (Story 9:16) and `1200x630` (Feed/WhatsApp 1.91:1) formats in `< 5ms`, with direct PNG download and URL sharing.
- **Bundle & Tests**: 97 tests across 12 test suites passing 100%. Initial JS bundle is **99.74 KB gzipped** (+3.87 KB delta), keeping total critical path well under the 120 KB budget.

### Session 13 | BMAD QA - Final Review, Independent Math Audit & Launch Readiness (Story 7.2) (2026-09-26)
- **Independent Math Audit (Q2)**: Built an independent Spencer (1971) spherical astronomy & bearing verifier in `tests/unit/qa-launch-audit.test.ts` and verified 100% agreement with the engine across Golden Tests 1–5 and 3 new real Egyptian routes (Cairo $\to$ Tanta, Cairo $\to$ El Mahalla El Kubra, Assiut $\to$ Sohag) across 3 times of day (9 route-time combinations).
- **Viral Spike & Security Hardening**: Created `netlify.toml` with immutable CDN caching headers (`max-age=31536000, immutable` for `/assets/*` and `/models/*`), strict `Content-Security-Policy` headers, and SPA fallback routing (`/* -> /index.html`). Added `sohag-station` to `public/data/places.json`.
- **Social Sharing & OpenGraph Preview**: Created `public/og-share.svg` and added complete OpenGraph (`og:title`, `og:description`, `og:image`, `og:locale`) and Twitter Card metadata to `index.html` for rich previews on WhatsApp, Facebook, and YouTube.
- **Final Bundle & QA Verdict**: **GO FOR LAUNCH 🚀**. All 14 user stories (1.1 through 7.2) are 100% Done. All **13 test suites (100 tests)** pass in `1.70s`. Final initial critical-path JS bundle is **99.79 KB gzipped** ($\le 100\text{ KB}$ Story 7.2 target and $\le 120\text{ KB}$ hard budget), with the 3D scene isolated in a **5.33 KB gzipped** lazy chunk. Full QA report published in `docs/qa-launch-report.md`.

## OPEN QUESTIONS (carry forward)
- None. All 13 BMAD sessions and all 14 stories (Epics 1–7) are 100% complete and verified **GO FOR LAUNCH**.





