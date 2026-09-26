# اقعد فين؟ (Sit Where?)

A mobile-first web app that tells microbus and bus riders in Egypt which side of the vehicle stays out of the sun for their exact trip, date and departure time, and which seats are coolest. When the side does not matter (night, sun over the roof, near tie), it says so.

Arabic first (Egyptian colloquial, RTL), English toggle. Works on weak data and offline after the first visit.

## How the answer is computed

1. **Road.** The real road route between the two places (OpenStreetMap). 150 routes between the main terminals, cities and universities ship with the app; any other trip is routed live with OSRM and cached on the phone. If no route can be fetched, a straight line is used and clearly labeled as approximate.
2. **Sun.** The NOAA solar position algorithm runs on the phone for every minute of the trip, in Africa/Cairo time (DST aware). No API.
3. **Seats.** Each passenger is sampled at four body points (lap, both shoulders, head). A ray is cast from each point towards the sun: if it leaves the cabin through a window, that point is in sun; if it hits the roof, a body panel, a seatback or a neighbor, it is in shade. Glass transmission falls off at grazing angles (Fresnel), and the sun near the horizon is faded out. There are no fudge factors: the high noon case, windshield glare and the shelter of middle seats all come from the same geometry.
4. **Verdict.** The average sun minutes on each side's window seats decide the side (`src/core/exposure/honest-rules.ts`). The trip is re-run with a 30 minute earlier and later departure and with slower and faster traffic to report how stable the answer is.

The 3D view (three.js, loaded only on request) is built from the same vehicle profile the engine ray-traces, and the sun is a directional light with shadow maps, so the sun patches on the seats are drawn by the GPU from the same windows the engine used.

## Places

Search runs in three layers, fastest first:

| Layer | Source | Size | Offline |
| --- | --- | --- | --- |
| Hubs | `src/data/hubs.ts`, curated terminals, cities, districts, universities | ~65 places, bundled | yes |
| Gazetteer | `public/data/gazetteer-eg.json`, every city, town, village, district, terminal, rail and metro station and university in OSM for Egypt | ~2,400 places, 55 KB gzip, loaded after first paint | after first load |
| Online | Photon (OpenStreetMap search) | anything: streets, schools, shops | no |

GPS is supported; a GPS point is never stored, and share links round it to about 1 km and name it by the nearest place.

## Project layout

```
src/core/        pure TypeScript, no DOM
  astronomy/     NOAA sun position, Cairo time zone
  exposure/      seat ray tracing, trip calculator, honest verdict rules
  geometry/      bearings, polyline codec, Douglas-Peucker simplification
src/adapters/    places search, routing (precomputed, live, cached, straight), weather, PWA
src/data/        hubs, vehicle profiles (HiAce 14-seat microbus, 49-seat coach), route index
src/ui/          React UI, "geography notebook" design, lazy three.js scene
scripts/         data pipeline: build-places.ts (OSM gazetteer), precompute-routes.ts (OSRM routes)
public/          service worker, fonts, icons, precomputed routes, gazetteer
tests/unit/      physics ground truth, data integrity, adapters, share links, copy
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
```

## Budgets

- Initial JS about 105 KB gzip, CSS about 5 KB, Arabic UI font 23 KB.
- The 3D chunk (about 156 KB gzip) loads only when the rider taps it.
- A 4 hour microbus trip with the four sensitivity passes computes in well under 100 ms on a laptop.

## Deployment and risks

Netlify, static. `netlify.toml` sets long cache lifetimes for hashed assets, fonts and route files, and a CSP that allows exactly three live services: Open-Meteo, the OSRM demo router and Photon.

Known risks, stated plainly:

- **Public services have no SLA.** The OSRM demo server and Photon are free and fair use only. A viral spike can get requests throttled. The app degrades gracefully (shipped routes, cached routes, offline gazetteer, labeled straight line), but for launch the robust fix is a small VPS running OSRM and Photon on the Egypt OpenStreetMap extract.
- **Travel time is a model.** Car time from OSRM times a vehicle factor plus stops. Traffic changes when the sun hits which side; the sensitivity check reports when that could flip the answer.
- **Clear sky and no curtains are assumed.** Cloud cover from Open-Meteo is shown as a note when it is significant.

Map, place and road data © OpenStreetMap contributors, ODbL.
