import type * as THREE from 'three';
import type { WindowSpec } from './spec.ts';

/** Where a face of the shell came from. */
export type ShellSlot = 'outer' | 'inner' | 'reveal' | 'well';

/** One piece of the shell: its geometry groups index into slots. */
export interface ShellPart {
  geometry: THREE.BufferGeometry;
  slots: ShellSlot[];
}

export interface ShellParts {
  body: ShellPart;
  skirt: ShellPart;
  roof: ShellPart;
  /** The windows actually cut, in the order they were cut (for verification). */
  openings: WindowSpec[];
}
