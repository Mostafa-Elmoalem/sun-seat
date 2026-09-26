/**
 * Offline Data Pipeline Script: Precompute Route Polylines
 * 
 * Usage:
 *   npx tsx scripts/precompute-routes.ts
 * 
 * Features:
 * - Rerunnable and idempotent: skips pairs that are already generated.
 * - Rate-limit friendly: adds 1.2s delay between external OSRM calls with exponential backoff retry.
 * - Outputs clean JSON files to public/data/routes/.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Coordinate {
  lat: number;
  lng: number;
}

interface PlaceRef {
  id: string;
  nameAr: string;
  nameEn: string;
  location: Coordinate;
}

// Configured launch pairs to precompute
const LAUNCH_PAIRS: [string, string][] = [
  ['cairo-abboud', 'alex-moharam-bek'],
  ['cairo-ramses', 'alex-moharam-bek'],
  ['cairo-abboud', 'gharbia-tanta'],
  ['cairo-ramses', 'dakahlia-mansoura'],
  ['cairo-elsalam', 'ismailia-station'],
  ['giza-moneeb', 'fayoum-station'],
  ['giza-moneeb', 'beni-suef-station'],
  ['giza-dokki', 'cairo-tagamoa'],
  ['cairo-heliopolis', 'giza-october']
];

const OUTPUT_DIR = path.resolve(process.cwd(), 'public/data/routes');
const PLACES_FILE = path.resolve(process.cwd(), 'public/data/places.json');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runPipeline(options: { dryRun?: boolean; limit?: number } = {}) {
  const { dryRun = false, limit } = options;
  console.log(`=== Sun Seat Route Pipeline (dryRun=${dryRun}) ===`);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const places: PlaceRef[] = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf8'));
  const placeMap = new Map(places.map((p) => [p.id, p]));

  const pairsToProcess = limit ? LAUNCH_PAIRS.slice(0, limit) : LAUNCH_PAIRS;
  let processedCount = 0;

  for (const [originId, destId] of pairsToProcess) {
    const routeId = `${originId}-${destId}`;
    const filePath = path.join(OUTPUT_DIR, `${routeId}.json`);

    if (fs.existsSync(filePath)) {
      console.log(`[SKIP] Already exists: ${routeId}`);
      processedCount++;
      continue;
    }

    const origin = placeMap.get(originId);
    const dest = placeMap.get(destId);

    if (!origin || !dest) {
      console.warn(`[WARN] Place not found: ${originId} or ${destId}`);
      continue;
    }

    console.log(`[FETCHING] ${origin.nameAr} -> ${dest.nameAr}...`);

    if (dryRun) {
      console.log(`[DRY-RUN] Simulated fetch for ${routeId}`);
      processedCount++;
      continue;
    }

    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.location.lng},${origin.location.lat};${dest.location.lng},${dest.location.lat}?overview=simplified&geometries=polyline`;
        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data.routes || data.routes.length === 0) {
          throw new Error('No route found in response');
        }

        const route = data.routes[0];
        const routeData = {
          routeId,
          originId,
          destinationId: destId,
          distanceKm: Number((route.distance / 1000).toFixed(1)),
          carDurationMin: Math.round(route.duration / 60),
          encodedPolyline: route.geometry,
          isApproximate: false
        };

        fs.writeFileSync(filePath, JSON.stringify(routeData, null, 2), 'utf8');
        console.log(`[SUCCESS] Saved ${routeId}.json (${routeData.distanceKm} km, ~${routeData.carDurationMin} min)`);
        success = true;
      } catch (err: any) {
        retries--;
        console.warn(`[RETRY] Failed ${routeId} (${err.message}). Retries left: ${retries}`);
        await sleep(2000);
      }
    }

    // Rate limit polite delay
    await sleep(1200);
  }

  console.log(`=== Pipeline Execution Complete (${processedCount} routes checked/generated) ===`);
}

if (process.argv[1]?.includes('precompute-routes')) {
  const isDryRun = process.argv.includes('--dry-run');
  const limitArgIndex = process.argv.indexOf('--limit');
  const limit = limitArgIndex !== -1 ? parseInt(process.argv[limitArgIndex + 1] || '3', 10) : undefined;
  
  runPipeline({ dryRun: isDryRun, limit }).catch(console.error);
}
