# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and daily commuters in Egypt who ride microbuses and intercity buses between and inside governorates. They open the site standing at a microbus terminal (موقف), often in direct sun, on a mid-range Android phone, one hand holding a bag or a rail, on weak and expensive mobile data. Their job: decide in seconds which side and which seat to take before the microbus fills up.

A second audience arrives from the owner's launch video, a comedic video titled around "ايه اهمية الجغرافيا اصلا؟". They come curious, on the same phones, in large bursts right after the video is published.

## Product Purpose

Tell a rider which side of the vehicle and which seats will get the least direct sun for a specific trip, date and departure time, and be honest when the side does not matter. Success: the rider gets a trustworthy answer in under four taps and actually sits there; video viewers try their own trip within seconds of landing.

## Positioning

The answer comes from real geometry, not a rule of thumb: the sun position is computed on the phone (NOAA algorithm, Africa/Cairo time), the vehicle heading comes from the real road route including its turns, and every seat's exposure is ray-traced through the actual window openings of a 14-seat HiAce microbus or a 49-seat coach, with the roof and neighboring passengers casting shade. The same geometry drives the 3D view, so what the rider sees is what was computed.

## Operating Context

- Origin and destination can be anywhere in Egypt: curated terminals and cities bundled with the app, an OpenStreetMap gazetteer of about 2,400 places loaded after first paint, online OSM search (Photon) for anything else, and GPS.
- Routes: 150 precomputed real road routes between hubs ship with the app; other trips use the public OSRM router live, cached on the phone; a straight line is the labeled last resort.
- Trip inputs: from, to, date, departure time (Cairo time), vehicle type (microbus or bus).
- The result is shared on WhatsApp and social media.

## Capabilities and Constraints

- Mobile first (360 x 800 baseline). Core answer must work on Slow 3G and offline after the first visit.
- Arabic first, RTL, Egyptian colloquial; English is a secondary toggle.
- Vehicle diagrams, seat maps and 3D scenes are never mirrored by RTL: front of the vehicle up, the driver side is the driver side.
- Sides are named by what riders see inside the vehicle: "ناحية السواق" (driver side, physical left) and "ناحية الباب" (door side, physical right). The words شمال and يمين are not used for sides.
- Sun position is computed on device; no API. All times use Africa/Cairo (Egypt observes DST).
- Engine is vehicle agnostic: vehicles are data profiles (microbus and bus now; private car and train later).
- Honest output: night, sun too high or too brief, and near ties are stated plainly.
- No accounts, no stored location; share links round coordinates.
- Free to run; static assets on Netlify CDN must survive a viral spike. Public routing and search services (OSRM demo, Photon) have no SLA.
- Map and place data: © OpenStreetMap contributors (ODbL), attribution required.

## Brand Commitments

- Working name "اقعد فين؟"; the owner is open to a better name.
- Voice: modern Egyptian colloquial, witty but fast and useful, never silly enough to slow the answer.
- The owner requires no em dashes or en dashes in copy or files.

## Evidence on Hand

- Real computed results for any trip (the engine is the demonstration).
- No testimonials, user counts, press, or accuracy benchmarks exist yet; none may be invented.

## Product Principles

1. The answer first: the verdict and the seat are readable at arm's length in sunlight before anything else loads.
2. Show the mechanism: route, sun and vehicle geometry are visible so the answer is believable, never a black box.
3. Honest over confident: say "مش فارقة" or "قريبة" when that is the truth.
4. Cheap on data and battery: nothing heavy loads unless the rider asks for it.
5. Speak the rider's language: driver side and door side, seat numbers as they sit, Cairo time.

## Accessibility & Inclusion

- Outdoor sunlight legibility: very high contrast for the verdict and seat labels.
- One-handed use: primary controls in the thumb zone, touch targets at least 48 px.
- Color is never the only carrier of meaning on the seat map (numbers and minutes are printed).
- Respect reduced motion and Save-Data.
