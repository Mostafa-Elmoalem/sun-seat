# اقعد فين؟ (Sit Where?)

A mobile-first web app that tells microbus and bus riders in Egypt which side of the vehicle stays out of the sun for their exact trip, date and departure time, and which seats are coolest. When the side does not matter (night, sun over the roof, near tie), it says so.

Arabic first (Egyptian colloquial, RTL), English toggle. Works on weak data and offline after the first visit.

## How the answer is computed

1. **Road.** The real road route between the two places (OpenStreetMap). 150 routes between the main terminals, cities and universities ship with the app; any other trip is routed live with OSRM and cached on the phone. If no route can be fetched, a straight line is used and clearly labeled as approximate.
2. **Sun.** The NOAA solar position algorithm runs on the phone for every minute of the trip, in Africa/Cairo time (DST aware). No API.
3. **Seats.** Each passenger is three boxes (thighs, torso, head) with six skin points (lap, both shoulders, face, nape, upper back). A ray is cast from each point towards the sun: if it leaves the cabin through a window (the windshield is raked, as on the real van), that point is in sun; if it hits the roof, a body panel, the dashboard, a backrest, a headrest, a neighbor or the passenger's own body, it is in shade. Glass transmission falls off at grazing angles (Fresnel), and the sun near the horizon is faded out. Every seat gets minutes of proper sun and of light sun. The back bench sits against the rear door with a short backrest, so sun from behind lands on those riders' backs.
4. **Verdict.** The average sun on each side's window seats decides the side (`src/core/exposure/honest-rules.ts`); a separate check says when the back bench or the front row takes clearly more sun, whatever the side. Seats are ranked by one score (the dose plus a share of every noticeable minute), rounded once, so the order can never put a sunnier seat above a shadier one. The trip is re-run with a 30 minute earlier and later departure and with slower and faster traffic to report how stable the answer is.

The 3D view is the egypt-microbus package (`packages/egypt-microbus`), built from the same spec the engine reads, so the sun patches the GPU draws come through the same windows the engine used.

## Places

Search runs in three layers, fastest first:

| Layer | Source | Size | Offline |
| --- | --- | --- | --- |
| Hubs | `src/data/hubs.ts`, curated terminals, cities, districts, universities | ~65 places, bundled | yes |
| Gazetteer | `public/data/gazetteer-eg.json`, every city, town, village, district, terminal, rail and metro station and university in OSM for Egypt | ~2,400 places, 55 KB gzip, loaded after first paint | after first load |
| Online | Photon (OpenStreetMap search) | anything: streets, schools, shops | no |

GPS is supported; a GPS point is never stored, and share links round it to about 1 km and name it by the nearest place.

## Project layout

Layers depend inward only: `ui` uses `app`, `app` uses `core` and `adapters`, and `core` depends on nothing.

```
src/core/          domain: pure TypeScript, no DOM, no framework
  astronomy/       NOAA sun position, Cairo time zone
  exposure/        seat ray tracing, trip calculator, honest verdict rules
  geometry/        bearings, polyline codec, Douglas-Peucker simplification
src/adapters/      infrastructure: places search, routing (precomputed, live, cached, straight), weather, PWA
src/data/          hubs, vehicle profiles (the microbus comes from the package spec), route index
src/app/           application layer, framework free
  trip/            the store, the calculate-trip use case, share links, recents, departure rules, GPS
  result/          presenters: verdict as data, per-seat display state, time bar cells, focus moment
src/ui/            presentation (React)
  features/        trip-form, result (verdict, stage, seat plan, time bar, road, working), vehicle-3d
  shared/          icons, segmented control
  hooks/           store binding, media query, playback, idle, network, element width
  i18n/            the copy deck and the verdict sentence
  styles/          tokens, base, controls, page, form, result
packages/
  egypt-microbus/  the 3D microbus as an isolated package (see its README)
src/lab/           development-only model lab (model-lab.html), not in the production build
scripts/           data pipeline and the precomputed microbus shell
public/            service worker, fonts, icons, precomputed routes, gazetteer, microbus shell
tests/unit/        physics ground truth, app layer, microbus package, data integrity, adapters, copy
```

## Commands

```bash
npm install
npm run dev            # local dev server
npm test               # unit tests
npm run build          # typecheck and production build (stamps the service worker)
npm run preview        # serve the production build

# Data pipeline (Node 22+)
node --experimental-strip-types scripts/build-places.ts --fetch    # refresh the OSM gazetteer
node --experimental-strip-types scripts/precompute-routes.ts       # fetch missing hub routes
node --experimental-strip-types scripts/precompute-routes.ts --force
node scripts/build-microbus-shell.mts                              # recut the microbus body after a spec change
```

## Budgets

- Initial JS about 110 KB gzip, CSS about 5 KB, Arabic UI font 23 KB.
- The 3D chunk (about 172 KB gzip) and the microbus shell (64 KB gzip) are fetched while the rider reads the answer, never on Save-Data or 2G; the CSG code (34 KB gzip) loads only if the shell file is missing.
- The full Ramses to Alexandria verdict, with the four sensitivity passes, computes in about 11 ms on a laptop.
- With a 4x CPU slowdown on a phone viewport: the 3D opens in about 2.2 s and orbits at about 60 fps (the scene redraws its shadows only when the sun or the view changes, merges static parts to a few dozen draw calls, and phones get a lighter material set).

## Deployment and risks

Netlify, static. `netlify.toml` sets long cache lifetimes for hashed assets, fonts and route files, and a CSP that allows exactly three live services: Open-Meteo, the OSRM demo router and Photon.

Known risks, stated plainly:

- **Public services have no SLA.** The OSRM demo server and Photon are free and fair use only. A viral spike can get requests throttled. The app degrades gracefully (shipped routes, cached routes, offline gazetteer, labeled straight line), but for launch the robust fix is a small VPS running OSRM and Photon on the Egypt OpenStreetMap extract.
- **Travel time is a model.** Car time from OSRM times a vehicle factor plus stops. Traffic changes when the sun hits which side; the sensitivity check reports when that could flip the answer.
- **Clear sky and no curtains are assumed.** Cloud cover from Open-Meteo is shown as a note when it is significant.

Map, place and road data © OpenStreetMap contributors, ODbL.
