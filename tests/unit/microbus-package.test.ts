import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildShell } from '../../packages/egypt-microbus/src/body.ts';
import { decodeShell, encodeShell } from '../../packages/egypt-microbus/src/shell-codec.ts';
import { buildMicrobus, EGYPT_MICROBUS_14 } from '../../packages/egypt-microbus/src/index.ts';
import { MICROBUS_14 } from '../../src/data/vehicles.ts';

const spec = EGYPT_MICROBUS_14;
const triangles = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;
const box = (g: THREE.BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox!;
};

describe('egypt-microbus shell', () => {
  const shell = buildShell(spec);

  it('cuts exactly the windows in the spec', () => {
    expect(shell.openings).toEqual(spec.windows);
  });

  it('has the real outside size: length, width and height from the spec', () => {
    const all = new THREE.Box3();
    for (const part of [shell.body, shell.skirt, shell.roof]) all.union(box(part.geometry));
    const size = all.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(spec.dimensions.widthM, 2);
    expect(size.y).toBeGreaterThan(spec.dimensions.heightM - spec.body.sideProfile.reduce((m, [, z]) => Math.min(m, z), 9) - 0.01);
    expect(all.max.y).toBeCloseTo(spec.dimensions.heightM, 2);
    expect(size.z).toBeGreaterThan(spec.dimensions.lengthM - 0.1);
    expect(size.z).toBeLessThanOrEqual(spec.dimensions.lengthM + 0.001);
  });

  it('keeps the skin, inner walls, reveals and wells as separate material slots', () => {
    expect(new Set(shell.body.slots)).toEqual(new Set(['outer', 'inner', 'reveal', 'well']));
  });

  it('survives encoding: same triangles, positions within a millimetre', () => {
    const decoded = decodeShell(spec, encodeShell(spec, shell));
    for (const name of ['body', 'skirt', 'roof'] as const) {
      expect(triangles(decoded[name].geometry)).toBe(triangles(shell[name].geometry));
      const a = box(shell[name].geometry);
      const b = box(decoded[name].geometry);
      expect(a.min.distanceTo(b.min)).toBeLessThan(0.001);
      expect(a.max.distanceTo(b.max)).toBeLessThan(0.001);
    }
  });

  it('the committed public/models file matches the current spec (rerun scripts/build-microbus-shell.mts if not)', () => {
    const file = readFileSync(new URL('../../public/models/egypt-microbus-shell.bin', import.meta.url));
    const decoded = decodeShell(spec, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    for (const name of ['body', 'skirt', 'roof'] as const) {
      expect(triangles(decoded[name].geometry)).toBe(triangles(shell[name].geometry));
      expect(box(decoded[name].geometry).max.distanceTo(box(shell[name].geometry).max)).toBeLessThan(0.001);
    }
  });

  it('refuses a shell file made for another vehicle', () => {
    const other = { ...spec, id: 'another-van' };
    expect(() => decodeShell(other, encodeShell(spec, shell))).toThrow();
  });
});

describe('egypt-microbus model', () => {
  const model = buildMicrobus(spec, { shell: buildShell(spec), destination: null });

  it('has one group per seat at its spec position, plus the driver', () => {
    for (const s of spec.seats) {
      const g = model.parts.seats.get(s.id)!;
      expect(g.name).toBe(`Seat_${String(s.id).padStart(2, '0')}`);
      expect(g.position.distanceTo(model.toModel(s.position.x, s.position.y, s.position.z))).toBeLessThan(1e-9);
    }
    expect(model.parts.seats.get(0)!.name).toBe('Seat_Driver');
  });

  it('has one glass pane per window', () => {
    expect(model.parts.glass.map((g) => g.name).sort()).toEqual(spec.windows.map((w) => `Glass_${w.id}`).sort());
  });

  it('the cutaway keeps the roof casting shadow while it stops drawing', () => {
    model.setCutaway(true);
    const roof = model.parts.roof[0] as THREE.Mesh;
    expect(roof.castShadow).toBe(true);
    expect((roof.material as THREE.Material).colorWrite).toBe(false);
    model.setCutaway(false);
    expect(Array.isArray(roof.material)).toBe(true);
  });
});

describe('one source of truth for the engine and the 3D', () => {
  it('the engine microbus uses the package seats, windows and body numbers', () => {
    expect(MICROBUS_14.windows).toEqual(spec.windows);
    expect(MICROBUS_14.dimensions.rearWallY).toBe(spec.dimensions.rearWallY);
    for (const s of spec.seats) {
      const e = MICROBUS_14.seats.find((x) => x.id === s.id)!;
      expect(e.position).toEqual(s.position);
      expect(e.backHeight).toBe(s.backHeight);
      expect(e.hasHeadrest).toBe(s.hasHeadrest);
    }
  });
});
