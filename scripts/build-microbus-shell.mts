/**
 * Cuts the microbus body once, here, and writes it as public/models/egypt-microbus-shell.bin,
 * so phones download the finished shell instead of spending seconds on CSG.
 * Run after any change to packages/egypt-microbus/src/spec.ts or body.ts:
 *   node scripts/build-microbus-shell.mts
 * A unit test fails when the committed file no longer matches the spec.
 */
import { writeFileSync } from 'node:fs';
import { buildShell } from '../packages/egypt-microbus/src/body.ts';
import { encodeShell } from '../packages/egypt-microbus/src/shell-codec.ts';
import { EGYPT_MICROBUS_14 } from '../packages/egypt-microbus/src/spec.ts';

const t0 = performance.now();
const parts = buildShell(EGYPT_MICROBUS_14);
const buffer = encodeShell(EGYPT_MICROBUS_14, parts);
const out = new URL('../public/models/egypt-microbus-shell.bin', import.meta.url);
writeFileSync(out, new Uint8Array(buffer));
const tris = (['body', 'skirt', 'roof'] as const).map((k) => {
  const g = parts[k].geometry;
  return `${k} ${(g.index ? g.index.count : g.getAttribute('position').count) / 3}`;
});
console.log(`egypt-microbus-shell.bin: ${buffer.byteLength} bytes (${tris.join(', ')} triangles) in ${Math.round(performance.now() - t0)} ms`);
