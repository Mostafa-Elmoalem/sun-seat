import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ShellPart, ShellParts, ShellSlot } from './body.ts';
import type { MicrobusSpec } from './spec.ts';

/**
 * A compact binary form of the CSG shell, so a page can download the finished body
 * (tens of kilobytes) instead of cutting it on the device (seconds on a mid-range phone).
 *
 * Layout, little endian:
 *   "EMB1", u32 spec id length, spec id (utf-8), u32 part count
 *   per part: f32 min xyz, f32 max xyz, u32 vertex count, u32 index count, u32 group count,
 *             groups (u32 start, u32 count, u8 slot), padding to 4 bytes,
 *             positions (u16 xyz, quantized inside min..max), normals (i8 xy octahedral),
 *             padding to 4 bytes, indices (u16 when fewer than 65536 vertices, else u32)
 * Quantization error is under 0.1 mm on a 5 m body.
 */

const MAGIC = 'EMB1';
const SLOTS: ShellSlot[] = ['outer', 'inner', 'reveal', 'well'];
const PART_NAMES = ['body', 'skirt', 'roof'] as const;

function octEncode(nx: number, ny: number, nz: number): [number, number] {
  const l1 = Math.abs(nx) + Math.abs(ny) + Math.abs(nz) || 1;
  let x = nx / l1;
  let y = ny / l1;
  if (nz < 0) {
    const ox = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
    const oy = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
    x = ox;
    y = oy;
  }
  return [Math.round(x * 127), Math.round(y * 127)];
}

function octDecode(ex: number, ey: number, out: THREE.Vector3): THREE.Vector3 {
  let x = ex / 127;
  let y = ey / 127;
  const z = 1 - Math.abs(x) - Math.abs(y);
  if (z < 0) {
    const ox = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
    const oy = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
    x = ox;
    y = oy;
  }
  return out.set(x, y, z).normalize();
}

/** Indexed copy of a part, with groups kept (vertices merged only where position and normal agree). */
function indexed(part: ShellPart): THREE.BufferGeometry {
  const source = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
  const g = mergeVertices(source, 1e-3);
  if (g.groups.length === 0) g.addGroup(0, g.index!.count, 0);
  return g;
}

export function encodeShell(spec: MicrobusSpec, parts: ShellParts): ArrayBuffer {
  const chunks: ArrayBuffer[] = [];
  const header = new TextEncoder().encode(spec.id);
  const head = new DataView(new ArrayBuffer(4 + 4 + header.length + 3 + 4));
  let o = 0;
  for (const ch of MAGIC) head.setUint8(o++, ch.charCodeAt(0));
  head.setUint32(o, header.length, true);
  o += 4;
  header.forEach((b) => head.setUint8(o++, b));
  o = (o + 3) & ~3;
  head.setUint32(o, PART_NAMES.length, true);
  chunks.push(head.buffer.slice(0, o + 4));

  for (const name of PART_NAMES) {
    const g = indexed(parts[name]);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const nor = g.getAttribute('normal') as THREE.BufferAttribute;
    const index = g.index!;
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    const span = new THREE.Vector3().subVectors(max, min).max(new THREE.Vector3(1e-6, 1e-6, 1e-6));
    const vCount = pos.count;
    const iCount = index.count;
    const wide = vCount >= 65536;
    const groupBytes = (g.groups.length * 9 + 3) & ~3;
    const posBytes = vCount * 6;
    const norBytes = (vCount * 2 + ((vCount * 6) % 4 === 0 ? 0 : 0) + 3) & ~3;
    const idxBytes = iCount * (wide ? 4 : 2);
    const size = 24 + 12 + groupBytes + ((posBytes + 3) & ~3) + norBytes + ((idxBytes + 3) & ~3);
    const view = new DataView(new ArrayBuffer(size));
    let p = 0;
    for (const v of [min.x, min.y, min.z, max.x, max.y, max.z]) {
      view.setFloat32(p, v, true);
      p += 4;
    }
    view.setUint32(p, vCount, true);
    view.setUint32(p + 4, iCount, true);
    view.setUint32(p + 8, g.groups.length, true);
    p += 12;
    const slotOf = parts[name].slots;
    const groupStart = p;
    for (const grp of g.groups) {
      view.setUint32(p, grp.start, true);
      view.setUint32(p + 4, grp.count, true);
      view.setUint8(p + 8, SLOTS.indexOf(slotOf[grp.materialIndex ?? 0] ?? 'outer'));
      p += 9;
    }
    p = groupStart + groupBytes;
    const posStart = p;
    for (let i = 0; i < vCount; i++) {
      view.setUint16(p, Math.round(((pos.getX(i) - min.x) / span.x) * 65535), true);
      view.setUint16(p + 2, Math.round(((pos.getY(i) - min.y) / span.y) * 65535), true);
      view.setUint16(p + 4, Math.round(((pos.getZ(i) - min.z) / span.z) * 65535), true);
      p += 6;
    }
    p = posStart + ((posBytes + 3) & ~3);
    const norStart = p;
    for (let i = 0; i < vCount; i++) {
      const [ex, ey] = octEncode(nor.getX(i), nor.getY(i), nor.getZ(i));
      view.setInt8(p, ex);
      view.setInt8(p + 1, ey);
      p += 2;
    }
    p = norStart + norBytes;
    for (let i = 0; i < iCount; i++) {
      if (wide) view.setUint32(p, index.getX(i), true);
      else view.setUint16(p, index.getX(i), true);
      p += wide ? 4 : 2;
    }
    chunks.push(view.buffer);
  }

  const total = chunks.reduce((a, c) => a + c.byteLength, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(new Uint8Array(c), at);
    at += c.byteLength;
  }
  return out.buffer;
}

/** Decodes a shell made by encodeShell. Throws when the file belongs to another spec. */
export function decodeShell(spec: MicrobusSpec, buffer: ArrayBuffer): ShellParts {
  const view = new DataView(buffer);
  let o = 0;
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== MAGIC) throw new Error('egypt-microbus: not a shell file');
  o = 4;
  const idLength = view.getUint32(o, true);
  o += 4;
  const id = new TextDecoder().decode(new Uint8Array(buffer, o, idLength));
  if (id !== spec.id) throw new Error(`egypt-microbus: shell file is for ${id}, not ${spec.id}`);
  o = (o + idLength + 3) & ~3;
  const partCount = view.getUint32(o, true);
  o += 4;
  const parts = {} as Record<(typeof PART_NAMES)[number], ShellPart>;
  const n = new THREE.Vector3();
  for (let k = 0; k < partCount; k++) {
    const min = [view.getFloat32(o, true), view.getFloat32(o + 4, true), view.getFloat32(o + 8, true)];
    const max = [view.getFloat32(o + 12, true), view.getFloat32(o + 16, true), view.getFloat32(o + 20, true)];
    const span = max.map((m, i) => Math.max(m - min[i]!, 1e-6));
    o += 24;
    const vCount = view.getUint32(o, true);
    const iCount = view.getUint32(o + 4, true);
    const gCount = view.getUint32(o + 8, true);
    o += 12;
    const geometry = new THREE.BufferGeometry();
    const slots: ShellSlot[] = [];
    const groupStart = o;
    for (let i = 0; i < gCount; i++) {
      const start = view.getUint32(o, true);
      const count = view.getUint32(o + 4, true);
      const slot = SLOTS[view.getUint8(o + 8)] ?? 'outer';
      let materialIndex = slots.indexOf(slot);
      if (materialIndex < 0) materialIndex = slots.push(slot) - 1;
      geometry.addGroup(start, count, materialIndex);
      o += 9;
    }
    o = groupStart + ((gCount * 9 + 3) & ~3);
    const positions = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      for (let a = 0; a < 3; a++) positions[i * 3 + a] = min[a]! + (view.getUint16(o + a * 2, true) / 65535) * span[a]!;
      o += 6;
    }
    o = (o + 3) & ~3;
    const normals = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      octDecode(view.getInt8(o), view.getInt8(o + 1), n);
      normals[i * 3] = n.x;
      normals[i * 3 + 1] = n.y;
      normals[i * 3 + 2] = n.z;
      o += 2;
    }
    o = (o + 3) & ~3;
    const wide = vCount >= 65536;
    const indices = wide ? new Uint32Array(iCount) : new Uint16Array(iCount);
    for (let i = 0; i < iCount; i++) {
      indices[i] = wide ? view.getUint32(o, true) : view.getUint16(o, true);
      o += wide ? 4 : 2;
    }
    o = (o + 3) & ~3;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    parts[PART_NAMES[k]!] = { geometry, slots };
  }
  return { ...parts, openings: spec.windows.slice() };
}
