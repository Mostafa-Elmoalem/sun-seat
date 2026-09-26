/**
 * Precomputes real road routes between the curated hubs so the most common trips
 * work instantly, offline, and without touching a public router during a viral spike.
 *
 * Usage:
 *   node --experimental-strip-types scripts/precompute-routes.ts            (skips existing files)
 *   node --experimental-strip-types scripts/precompute-routes.ts --force    (refetches everything)
 *
 * Source: OSRM demo server (OpenStreetMap data), full geometry simplified with
 * Douglas-Peucker at 25 m. Each route is validated: the decoded polyline must start
 * and end within 2.5 km of the hub coordinates, otherwise it is rejected.
 * Writes public/data/routes/<origin>__<destination>.json and src/data/route-index.ts.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { HUBS, getHubById } from '../src/data/hubs.ts';
import { decodePolyline, encodePolyline } from '../src/core/geometry/polyline-decoder.ts';
import { simplifyPolyline } from '../src/core/geometry/simplify.ts';
import { calculateDistanceKm } from '../src/core/geometry/bearing.ts';
import { routeIdFor } from '../src/adapters/route-id.ts';

const OUTPUT_DIR = path.resolve('public/data/routes');
const INDEX_FILE = path.resolve('src/data/route-index.ts');
const MAX_ENDPOINT_OFFSET_KM = 2.5;

/** Unordered pairs; both directions are fetched because one-way roads differ. */
const PAIRS: [string, string][] = [
  // Delta from Abboud
  ['cairo-abboud', 'alex-moharam-bek'],
  ['cairo-abboud', 'gharbia-tanta'],
  ['cairo-abboud', 'gharbia-mahalla'],
  ['cairo-abboud', 'dakahlia-mansoura'],
  ['cairo-abboud', 'menoufia-shebin'],
  ['cairo-abboud', 'kafr-el-sheikh'],
  ['cairo-abboud', 'beheira-damanhour'],
  ['cairo-abboud', 'qalyubia-banha'],
  ['cairo-abboud', 'damietta'],
  // Long distance from Turgoman
  ['cairo-turgoman', 'alex-moharam-bek'],
  ['cairo-turgoman', 'ismailia'],
  ['cairo-turgoman', 'port-said'],
  ['cairo-turgoman', 'suez'],
  ['cairo-turgoman', 'hurghada'],
  ['cairo-turgoman', 'sharm'],
  ['cairo-turgoman', 'marsa-matruh'],
  ['cairo-turgoman', 'alamein'],
  ['cairo-turgoman', 'assiut'],
  ['cairo-turgoman', 'luxor'],
  ['cairo-turgoman', 'aswan'],
  // Ramses and Ahmed Helmy
  ['cairo-ramses', 'alex-moharam-bek'],
  ['cairo-ramses', 'gharbia-tanta'],
  ['cairo-ramses', 'dakahlia-mansoura'],
  ['cairo-ramses', 'sharqia-zagazig'],
  ['cairo-ahmed-helmy', 'gharbia-tanta'],
  ['cairo-ahmed-helmy', 'dakahlia-mansoura'],
  ['cairo-ahmed-helmy', 'sharqia-zagazig'],
  ['cairo-ahmed-helmy', 'qalyubia-banha'],
  // Upper Egypt from Moneeb and Giza
  ['giza-moneeb', 'fayoum'],
  ['giza-moneeb', 'beni-suef'],
  ['giza-moneeb', 'minya'],
  ['giza-moneeb', 'assiut'],
  ['giza-moneeb', 'sohag'],
  ['giza-moneeb', 'alex-moharam-bek'],
  ['giza-square', 'fayoum'],
  ['giza-square', 'alex-moharam-bek'],
  // East from Marg and Salam
  ['cairo-marg', 'sharqia-zagazig'],
  ['cairo-marg', 'ismailia'],
  ['cairo-marg', 'sharqia-10th-ramadan'],
  ['cairo-marg', 'arish'],
  ['cairo-salam', 'suez'],
  ['cairo-salam', 'ismailia'],
  ['cairo-salam', 'port-said'],
  ['cairo-salam', 'sharqia-10th-ramadan'],
  ['cairo-salam', 'ain-sokhna'],
  // Inside Greater Cairo
  ['giza-dokki', 'cairo-new-cairo'],
  ['giza-dokki', 'cairo-nasr-city'],
  ['giza-dokki', 'cairo-heliopolis'],
  ['giza-dokki', 'giza-october'],
  ['uni-cairo', 'cairo-nasr-city'],
  ['uni-cairo', 'cairo-heliopolis'],
  ['uni-cairo', 'giza-october'],
  ['uni-cairo', 'cairo-shubra'],
  ['uni-cairo', 'cairo-new-cairo'],
  ['uni-ain-shams', 'giza-october'],
  ['uni-ain-shams', 'giza-dokki'],
  ['uni-ain-shams', 'cairo-new-cairo'],
  ['cairo-tahrir', 'giza-october'],
  ['cairo-tahrir', 'giza-zayed'],
  ['cairo-tahrir', 'cairo-new-cairo'],
  ['cairo-tahrir', 'cairo-helwan'],
  ['cairo-tahrir', 'cairo-new-capital'],
  ['cairo-ramses', 'giza-october'],
  ['cairo-ramses', 'cairo-new-cairo'],
  ['cairo-ramses', 'cairo-helwan'],
  ['cairo-nasr-city', 'cairo-new-capital'],
  ['cairo-nasr-city', 'giza-october'],
  ['giza-october', 'cairo-heliopolis'],
  ['cairo-maadi', 'cairo-new-cairo'],
  ['uni-helwan', 'cairo-tahrir'],
  // Alexandria and Delta
  ['alex-sidi-gaber', 'alex-agami'],
  ['alex-raml', 'alex-borg-el-arab'],
  ['gharbia-tanta', 'dakahlia-mansoura'],
  ['dakahlia-mansoura', 'damietta'],
  ['sharqia-zagazig', 'dakahlia-mansoura']
];

interface OsrmResponse {
  code: string;
  routes?: { distance: number; duration: number; geometry: string }[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchRoute(fromId: string, toId: string): Promise<object | null> {
  const from = getHubById(fromId);
  const to = getHubById(toId);
  if (!from || !to) throw new Error(`Unknown hub ${fromId} or ${toId}`);

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.location.lng},${from.location.lat};${to.location.lng},${to.location.lat}` +
    `?overview=full&geometries=polyline`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'sun-seat-data-build/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as OsrmResponse;
      const route = data.routes?.[0];
      if (data.code !== 'Ok' || !route) throw new Error(`OSRM code ${data.code}`);

      const full = decodePolyline(route.geometry);
      const simplified = simplifyPolyline(full, 25);
      const first = simplified[0]!;
      const last = simplified[simplified.length - 1]!;
      const startOffset = calculateDistanceKm(first[0], first[1], from.location.lat, from.location.lng);
      const endOffset = calculateDistanceKm(last[0], last[1], to.location.lat, to.location.lng);
      if (startOffset > MAX_ENDPOINT_OFFSET_KM || endOffset > MAX_ENDPOINT_OFFSET_KM) {
        console.warn(`[REJECT] ${fromId} -> ${toId}: endpoints off by ${startOffset.toFixed(1)} / ${endOffset.toFixed(1)} km`);
        return null;
      }

      return {
        routeId: routeIdFor(fromId, toId),
        originId: fromId,
        destinationId: toId,
        distanceKm: Number((route.distance / 1000).toFixed(1)),
        carDurationMin: Math.round(route.duration / 60),
        encodedPolyline: encodePolyline(simplified),
        source: 'osrm',
        pointCount: simplified.length
      };
    } catch (err) {
      console.warn(`[RETRY ${attempt}] ${fromId} -> ${toId}: ${(err as Error).message}`);
      await sleep(3000 * attempt);
    }
  }
  return null;
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const hubIds = new Set(HUBS.map((h) => h.id));
  for (const [a, b] of PAIRS) {
    if (!hubIds.has(a) || !hubIds.has(b)) throw new Error(`Pair references unknown hub: ${a}, ${b}`);
  }

  const directed = PAIRS.flatMap(([a, b]) => [
    [a, b],
    [b, a]
  ]) as [string, string][];

  for (const [from, to] of directed) {
    const file = path.join(OUTPUT_DIR, `${routeIdFor(from, to)}.json`);
    if (!force && fs.existsSync(file)) continue;
    const data = await fetchRoute(from, to);
    if (data) {
      fs.writeFileSync(file, `${JSON.stringify(data)}\n`);
      console.log(`[OK] ${routeIdFor(from, to)} (${fs.statSync(file).size} bytes)`);
    }
    await sleep(1100);
  }

  const index = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith('.json') && f.includes('__'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  fs.writeFileSync(
    INDEX_FILE,
    '// Generated by scripts/precompute-routes.ts. Do not edit by hand.\n' +
      `export const PRECOMPUTED_ROUTE_IDS: readonly string[] = ${JSON.stringify(index)};\n`
  );
  console.log(`[INDEX] ${index.length} routes listed in ${INDEX_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
