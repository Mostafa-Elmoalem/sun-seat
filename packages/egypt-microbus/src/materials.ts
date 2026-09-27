import * as THREE from 'three';
import { lensTexture, plateTexture, seatFabricTexture } from './textures.ts';

export interface Livery {
  /** Main body paint. */
  body: string;
  /** Lower skirt and bumpers (the dark blue of many Egyptian microbus lines). */
  skirt: string;
  /** Seat fabric base color. */
  seat: string;
}

export const DEFAULT_LIVERY: Livery = {
  body: '#f3f4f0',
  skirt: '#1f3a8a',
  seat: '#7a2e32'
};

export interface MicrobusMaterials {
  paint: THREE.MeshStandardMaterial;
  skirt: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  lens: THREE.MeshStandardMaterial;
  /** Inside of the wheel wells. */
  well: THREE.MeshStandardMaterial;
  amber: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  reverse: THREE.MeshStandardMaterial;
  plate: THREE.MeshStandardMaterial;
  tire: THREE.MeshStandardMaterial;
  rim: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  /** Painted inner walls of the shell (no reflections, so sun patches keep their contrast). */
  interior: THREE.MeshStandardMaterial;
  /** Roof lining. Never sunlit, so it carries a little bounce light of its own. */
  headliner: THREE.MeshStandardMaterial;
  panel: THREE.MeshStandardMaterial;
  dash: THREE.MeshStandardMaterial;
  seat: THREE.MeshStandardMaterial;
  headrest: THREE.MeshStandardMaterial;
  occupant: THREE.MeshStandardMaterial;
  all: THREE.Material[];
}

/**
 * Exterior materials take the optional environment map (reflections on paint,
 * chrome and glass). Interior materials never do, so reflections cannot wash out
 * the sun patches inside the cabin. The low quality drops clearcoat and physical glass,
 * which cost the most to compile and to draw on a phone.
 */
export function createMaterials(livery: Livery, envMap: THREE.Texture | null, plateText: string, quality: 'high' | 'low' = 'high'): MicrobusMaterials {
  const ext = { envMap, envMapIntensity: envMap ? 1 : 0 };
  const high = quality === 'high';
  const lacquer = (color: string, roughness: number, clearcoat: number) =>
    high
      ? new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat, clearcoatRoughness: 0.13, ...ext })
      : new THREE.MeshStandardMaterial({ color, roughness: roughness * 0.9, metalness: 0, ...ext });
  const paint = lacquer(livery.body, 0.34, 1);
  const skirt = lacquer(livery.skirt, 0.36, 0.9);
  const trim = new THREE.MeshStandardMaterial({ color: '#17191c', roughness: 0.55, metalness: 0.05, ...ext, envMapIntensity: envMap ? 0.35 : 0 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.16, metalness: 1, ...ext });
  const glass = new THREE.MeshStandardMaterial({
    color: '#7f9fb6',
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
    ...ext
  });
  const lens = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: lensTexture(),
    roughness: 0.08,
    transparent: true,
    opacity: 0.55,
    emissive: '#fff6de',
    emissiveIntensity: 0.12,
    ...ext
  });
  const well = new THREE.MeshStandardMaterial({ color: '#0b0c0e', roughness: 0.95, side: THREE.DoubleSide });
  const amber = new THREE.MeshStandardMaterial({ color: '#ffa31a', roughness: 0.25, emissive: '#ff8a00', emissiveIntensity: 0.15, ...ext, envMapIntensity: envMap ? 0.5 : 0 });
  const red = new THREE.MeshStandardMaterial({ color: '#b3121f', roughness: 0.25, emissive: '#7a0710', emissiveIntensity: 0.2, ...ext, envMapIntensity: envMap ? 0.5 : 0 });
  const reverse = new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.2, ...ext, envMapIntensity: envMap ? 0.5 : 0 });
  const plateMap = plateText ? plateTexture(plateText) : null;
  const plate = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, map: plateMap });
  const tire = new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.92 });
  const rim = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.3, metalness: 0.85, ...ext });
  const floor = new THREE.MeshStandardMaterial({ color: '#34373c', roughness: 0.95 });
  const panel = new THREE.MeshStandardMaterial({ color: '#cbc4b4', roughness: 0.85 });
  const interior = new THREE.MeshStandardMaterial({ color: '#e4e2dc', roughness: 0.6 });
  const headliner = new THREE.MeshStandardMaterial({ color: '#d8d3c6', roughness: 0.9, emissive: '#d8d3c6', emissiveIntensity: 0.12 });
  const dash = new THREE.MeshStandardMaterial({ color: '#26292e', roughness: 0.7 });
  const fabric = seatFabricTexture(livery.seat);
  const seat = new THREE.MeshStandardMaterial({ color: fabric ? '#ffffff' : livery.seat, map: fabric, roughness: 0.95 });
  const headrest = new THREE.MeshStandardMaterial({ color: new THREE.Color(livery.seat).multiplyScalar(0.78), roughness: 0.9 });
  const occupant = new THREE.MeshStandardMaterial({ color: '#98a3ba', roughness: 0.85 });
  const all = [paint, skirt, trim, rubber, chrome, glass, lens, well, amber, red, reverse, plate, tire, rim, floor, interior, headliner, panel, dash, seat, headrest, occupant];
  return { paint, skirt, trim, rubber, chrome, glass, lens, well, amber, red, reverse, plate, tire, rim, floor, interior, headliner, panel, dash, seat, headrest, occupant, all };
}
