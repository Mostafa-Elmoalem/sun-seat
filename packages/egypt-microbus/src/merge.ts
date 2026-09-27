import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Draw-call budget. Hundreds of small parts (seals, lamps, seat pieces) each cost a
 * draw call per pass, which is what makes a phone stutter. This merges every plain mesh
 * under `root` that shares a material and the same shadow flags into one mesh, with its
 * transform baked in. Instanced meshes, meshes with material arrays and anything `keep`
 * returns true for are left alone; emptied groups stay in place as markers.
 * Returns the merged geometries so the caller can dispose them.
 */
export function mergeByMaterial(root: THREE.Object3D, keep: (mesh: THREE.Mesh) => boolean = () => false): THREE.BufferGeometry[] {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material) || !mesh.visible || keep(mesh)) return;
    const material = mesh.material as THREE.Material;
    const key = `${material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${mesh.renderOrder}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material, cast: mesh.castShadow, receive: mesh.receiveShadow, parts: [], meshes: [] };
      buckets.set(key, bucket);
    }
    bucket.meshes.push(mesh);
  });

  const merged: THREE.BufferGeometry[] = [];
  const local = new THREE.Matrix4();
  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < 2) continue;
    const parts = bucket.meshes.map((mesh) => {
      const g = uniform(mesh.geometry.clone());
      g.applyMatrix4(local.multiplyMatrices(toRoot, mesh.matrixWorld));
      return g;
    });
    const geometry = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!geometry) continue;
    bucket.meshes.forEach((mesh) => mesh.removeFromParent());
    const mesh = new THREE.Mesh(geometry, bucket.material);
    mesh.castShadow = bucket.cast;
    mesh.receiveShadow = bucket.receive;
    root.add(mesh);
    merged.push(geometry);
  }
  return merged;
}

/** Same attributes everywhere (position, normal, uv) and always indexed, so any parts can merge. */
function uniform(g: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  g.morphAttributes = {};
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const count = g.getAttribute('position').count;
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  if (!g.index) {
    const index = new Uint32Array(count);
    for (let i = 0; i < count; i++) index[i] = i;
    g.setIndex(new THREE.BufferAttribute(index, 1));
  }
  g.clearGroups();
  return g;
}
