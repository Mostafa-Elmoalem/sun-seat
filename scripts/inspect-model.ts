/**
 * Prints the structure of a downloaded glTF/GLB so we can pick the van to keep,
 * find its glass materials and read its real dimensions.
 *
 * Usage: node --experimental-strip-types scripts/inspect-model.ts assets-src/hiace/scene.gltf
 */
import { NodeIO, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';

const file = process.argv[2];
if (!file) throw new Error('Pass the path to a .gltf or .glb file');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file);
const root = doc.getRoot();

function triangles(node: Node): number {
  let n = 0;
  node.traverse((child) => {
    const mesh = child.getMesh();
    if (!mesh) return;
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      n += Math.floor((idx ? idx.getCount() : pos?.getCount() ?? 0) / 3);
    }
  });
  return n;
}

const fmt = (v: number[]) => v.map((x) => x.toFixed(2)).join(', ');
for (const scene of root.listScenes()) {
  console.log(`scene "${scene.getName()}"`);
  const walk = (node: Node, depth: number) => {
    const b = getBounds(node);
    const size = b.max.map((m, i) => m - b.min[i]!);
    console.log(`${'  '.repeat(depth)}- "${node.getName()}" tris=${triangles(node)} size=[${fmt(size)}] min=[${fmt(b.min)}]`);
    if (depth < 3) node.listChildren().forEach((c) => walk(c, depth + 1));
  };
  scene.listChildren().forEach((n) => walk(n, 1));
}

console.log('\nmaterials:');
for (const m of root.listMaterials()) {
  const c = m.getBaseColorFactor();
  console.log(`- "${m.getName()}" alpha=${m.getAlphaMode()} color=[${fmt(c)}] tex=${m.getBaseColorTexture() ? 'yes' : 'no'}`);
}
console.log(`\ntextures: ${root.listTextures().length}, meshes: ${root.listMeshes().length}`);
