# PROJECT CONTEXT CAPSULE

Paste this at the top of every AI session. Update it when a decision changes.

## Project

- **Name:** اقعد فين؟ (working name, the owner is open to a better one)
- **One-liner:** tells microbus and bus riders in Egypt which side (ناحية السواق or ناحية الباب) and which seats get the least direct sun for their exact trip, date and time, and says so plainly when it does not matter.
- **Owner:** Mostafa, software engineer (React, UI/UX), in Egypt.
- **Launch:** a comedic video titled around "ايه اهمية الجغرافيا اصلا؟"; expect traffic spikes right after it is published.

## Users

Students and daily commuters at a microbus terminal, often in direct sun, one hand busy, mid-range Android, weak and expensive data.

## Hard constraints

1. Mobile first (360 x 800), usable on Slow 3G, offline after the first visit.
2. Arabic first (Egyptian colloquial, RTL), English toggle.
3. Sides are named "ناحية السواق" and "ناحية الباب" only. Never شمال or يمين for a side.
4. Vehicle diagrams, the 3D view and maps are never mirrored by RTL.
5. Sun position computed on the phone (NOAA), all times in Africa/Cairo (DST aware).
6. Honest output: night, does not matter, near tie are stated plainly.
7. No accounts, no stored location; share links round GPS to about 1 km.
8. Free or near free to run on Netlify; must survive a viral spike.
9. No em dashes or en dashes anywhere (copy, code, docs). A test enforces it.

## How it works now (September 2026)

- **Stack:** Vite, React 19, TypeScript strict, Zustand, three.js (lazy chunk), Vitest. Netlify static hosting.
- **Places:** 65 curated hubs (`src/data/hubs.ts`), an OSM gazetteer of about 2,400 Egyptian places (`public/data/gazetteer-eg.json`, built by `scripts/build-places.ts`), Photon online search, GPS.
- **Routes:** 150 real OSRM routes between hubs (`public/data/routes`, built by `scripts/precompute-routes.ts`), live OSRM with on-phone cache for anything else, a labeled straight line as last resort.
- **Engine:** per-passenger ray tracing through the vehicle's real window openings; roof, panels, seatbacks, headrests and neighbors cast shade (`src/core/exposure`). Verdict from window-seat sun minutes per side, plus a sensitivity check (30 min earlier or later, slow or fast traffic).
- **Vehicles:** 14-seat HiAce microbus (owner-confirmed layout: 2 up front, 3 benches of 3 with a folding jump seat on the door side, back bench of 3) and a 49-seat coach, as data in `src/data/vehicles.ts`. The 3D view is built from the same profile.
- **Design:** "كراسة الجغرافيا" (geography notebook), chosen by the owner through the impeccable skill. See `DESIGN.md` (system) and `PRODUCT.md` (product truth).
- **Tests:** `npm test` covers compass ground truth, seat physics, route and place data integrity, adapters, share links, copy rules.

## Decisions log

- 2026-09-26: Audit found fabricated route data (the Cairo to Alexandria demo route started near Qena and gave the wrong side), a fake SVG "3D", 31 hardcoded places and a service worker that froze the first version. Rebuilt data, engine, UI and 3D.
- 2026-09-26: Side naming, first screen (the form), Arabic first with English toggle, and the notebook direction confirmed by the owner.
- 2026-09-26: Real HiAce model chosen: "Toyota Hiace Kombi And Super Long Wheelbase" by Nieve5677 on Sketchfab (CC BY 4.0), high-roof long commuter. The owner downloads it into `assets-src/hiace/` (not committed); a decimated copy ships in `public/models/` with visible credit in the app. The engine's window profile is to be measured from the model.
- 2026-09-26: Old BMAD prompt pack and `docs/` removed (in git history).

## Open questions

- Self-host OSRM and Photon before the video (recommended), or accept the public-service risk?
- Final product name.
- Rebuild a share image card (story format) in the notebook style?
