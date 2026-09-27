import * as THREE from 'three';
import { buildShell, type ShellPart, type ShellSlot } from './body.ts';
import { buildExterior } from './details.ts';
import { buildWheels } from './wheels.ts';
import { buildCabin, type Occupants } from './cabin.ts';
import { createMaterials, DEFAULT_LIVERY, type Livery, type MicrobusMaterials } from './materials.ts';
import { contactShadowTexture, destinationCardTexture } from './textures.ts';
import { EGYPT_MICROBUS_14, type MicrobusSpec, type WindowSpec } from './spec.ts';

export * from './spec.ts';
export { DEFAULT_LIVERY, type Livery } from './materials.ts';
export type { Occupants } from './cabin.ts';

export interface BuildOptions {
  livery?: Partial<Livery>;
  /** Environment map for reflections on paint, chrome and glass (for example RoomEnvironment through PMREM). */
  envMap?: THREE.Texture | null;
  /** Arabic letters and digits on the plates. Empty string for blank plates. */
  plateText?: string;
  /** Destination written on the card behind the windshield, or null for none. */
  destination?: string | null;
  /** Seated passengers on every seat (hide one with setOccupied). */
  occupants?: boolean;
  /** A soft dark ellipse on the ground under the body. */
  contactShadow?: boolean;
}

export interface MicrobusModel {
  /** Everything, in meters. Ground at y = 0, nose towards -Z, door side towards +X. */
  group: THREE.Group;
  spec: MicrobusSpec;
  parts: {
    body: THREE.Mesh;
    skirt: THREE.Mesh;
    /** The roof panel, its gutters and the headliner. Hide them (keep them casting shadow) for a cutaway view. */
    roof: THREE.Object3D[];
    glass: THREE.Mesh[];
    wheels: THREE.Group;
    details: THREE.Group;
    cabin: THREE.Group;
    seats: Map<number, THREE.Group>;
    occupants: Occupants | null;
    contactShadow: THREE.Mesh | null;
  };
  materials: MicrobusMaterials;
  /** The windows cut into the shell, exactly spec.windows. */
  openings: WindowSpec[];
  /** Vehicle-frame point (x across, y from the front bumper, z up) to model coordinates. */
  toModel(x: number, y: number, z: number): THREE.Vector3;
  setOccupied(seatId: number, occupied: boolean): void;
  setDestination(text: string | null): void;
  /**
   * Cutaway view: the roof, its rails and the headliner stop drawing but keep casting
   * shadows, so the cabin seen from above is still shaded exactly as with the roof on.
   */
  setCutaway(on: boolean): void;
  dispose(): void;
}

/**
 * Builds the Egyptian 14-seat microbus. The shell geometry is computed once per
 * spec id and cached; the rest is cheap.
 */
export function buildMicrobus(spec: MicrobusSpec = EGYPT_MICROBUS_14, options: BuildOptions = {}): MicrobusModel {
  const livery = { ...DEFAULT_LIVERY, ...options.livery };
  const materials = createMaterials(livery, options.envMap ?? null, options.plateText ?? 'ن ق ب  ٤٥٣٢');
  const L = spec.dimensions.lengthM;
  const owned: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    owned.push(g);
    return g;
  };

  const group = new THREE.Group();
  group.name = 'EgyptMicrobus';

  const shell = buildShell(spec);
  const shellMesh = (part: ShellPart, skin: THREE.Material, name: string) => {
    const bySlot: Record<ShellSlot, THREE.Material> = { outer: skin, inner: materials.interior, reveal: materials.trim, well: materials.well };
    const mesh = new THREE.Mesh(part.geometry, part.slots.map((slot) => bySlot[slot]));
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const body = shellMesh(shell.body, materials.paint, 'Body');
  const skirt = shellMesh(shell.skirt, materials.skirt, 'Skirt');
  const roofPanel = shellMesh(shell.roof, materials.paint, 'Roof');

  const exterior = buildExterior(spec, materials, track);
  group.add(exterior.details, exterior.roofDetails);
  const wheels = buildWheels(spec, materials, track);
  group.add(wheels);
  const cabin = buildCabin(spec, materials, track, { occupants: options.occupants ?? true, destination: options.destination ?? null });
  group.add(cabin.cabin, cabin.ceiling);

  let contactShadow: THREE.Mesh | null = null;
  if (options.contactShadow ?? true) {
    const map = contactShadowTexture();
    if (map) {
      contactShadow = new THREE.Mesh(
        track(new THREE.PlaneGeometry(spec.dimensions.widthM + 0.7, L + 0.8)),
        new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, color: '#000000' })
      );
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.004;
      contactShadow.renderOrder = -1;
      contactShadow.name = 'ContactShadow';
      group.add(contactShadow);
    }
  }

  // Shadow-only stand-in for the cutaway: writes neither color nor depth in the main pass,
  // while the shadow pass still renders the mesh with its own depth material.
  const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const roofMeshes: THREE.Mesh[] = [];
  for (const root of [roofPanel, exterior.roofDetails, cabin.ceiling]) {
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) roofMeshes.push(o as THREE.Mesh);
    });
  }
  const roofMaterials = new Map(roofMeshes.map((mesh) => [mesh, mesh.material]));

  const model: MicrobusModel = {
    group,
    spec,
    parts: {
      body,
      skirt,
      roof: [roofPanel, exterior.roofDetails, cabin.ceiling],
      glass: exterior.glass,
      wheels,
      details: exterior.details,
      cabin: cabin.cabin,
      seats: cabin.seats,
      occupants: cabin.occupants,
      contactShadow
    },
    materials,
    openings: shell.openings,
    toModel: (x, y, z) => new THREE.Vector3(x, z, y - L / 2),
    setOccupied: (seatId, occupied) => cabin.occupants?.setOccupied(seatId, occupied),
    setDestination: (text) => {
      const card = cabin.destinationCard;
      if (!card) return;
      card.visible = !!text;
      if (!text) return;
      const mat = card.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.map = destinationCardTexture(text);
      mat.needsUpdate = true;
    },
    setCutaway: (on) => {
      for (const mesh of roofMeshes) {
        mesh.material = on ? shadowOnly : roofMaterials.get(mesh)!;
        mesh.receiveShadow = !on;
      }
    },
    dispose: () => {
      // The shell geometry is shared through the cache and outlives one model.
      owned.forEach((g) => g.dispose());
      shadowOnly.dispose();
      model.setCutaway(false);
      const disposed = new Set<THREE.Material>();
      group.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const mm of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          if (disposed.has(mm)) continue;
          disposed.add(mm);
          for (const value of Object.values(mm)) if (value instanceof THREE.Texture) value.dispose();
          mm.dispose();
        }
      });
    }
  };
  return model;
}
