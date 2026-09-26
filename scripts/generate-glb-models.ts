/**
 * Generates compact glTF 2.0 binary (.glb) low-poly vehicle models in public/models/
 * for microbus-14.glb and bus-49.glb (< 5 KB each, budget < 80 KB).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { defaultVehicleRepository } from '../src/core/vehicles/vehicle-repository.ts';
import type { VehicleProfile } from '../src/core/types/vehicle.ts';

function buildGlbBuffer(profile: VehicleProfile): Buffer {
  const halfW = profile.dimensions.widthM / 2;
  const halfL = profile.dimensions.lengthM / 2;
  const h = profile.dimensions.heightM;

  // 8 vertices of the stylized bounding hull (x, y, z floats)
  const vertices = new Float32Array([
    -halfW, 0.2, -halfL,
     halfW, 0.2, -halfL,
     halfW, h,   -halfL,
    -halfW, h,   -halfL,
    -halfW, 0.2,  halfL,
     halfW, 0.2,  halfL,
     halfW, h,    halfL,
    -halfW, h,    halfL
  ]);

  // 12 triangles (36 uint16 indices)
  const indices = new Uint16Array([
    0, 1, 2,  0, 2, 3, // Front
    4, 6, 5,  4, 7, 6, // Rear
    0, 3, 7,  0, 7, 4, // Left
    1, 5, 6,  1, 6, 2, // Right
    3, 2, 6,  3, 6, 7, // Roof
    0, 4, 5,  0, 5, 1  // Floor
  ]);

  const binChunkRaw = Buffer.concat([
    Buffer.from(vertices.buffer),
    Buffer.from(indices.buffer)
  ]);
  // Pad binary chunk to 4-byte alignment
  const binPad = (4 - (binChunkRaw.length % 4)) % 4;
  const binChunk = Buffer.concat([binChunkRaw, Buffer.alloc(binPad, 0)]);

  const gltfJson = {
    asset: {
      version: '2.0',
      generator: 'sun-seat low-poly generator'
    },
    extras: {
      vehicleId: profile.id,
      totalSeats: profile.totalSeats,
      seats: profile.seats.map((s) => ({
        id: s.id,
        side: s.side,
        pos: [s.position.x, s.position.z, s.position.y]
      }))
    },
    scenes: [{ nodes: [0] }],
    nodes: [{ name: profile.id, mesh: 0 }],
    meshes: [
      {
        name: `${profile.id}-hull`,
        primitives: [{ attributes: { POSITION: 0 }, indices: 1 }]
      }
    ],
    buffers: [{ byteLength: binChunk.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: vertices.byteLength, target: 34962 },
      { buffer: 0, byteOffset: vertices.byteLength, byteLength: indices.byteLength, target: 34963 }
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 8,
        type: 'VEC3',
        min: [-halfW, 0.2, -halfL],
        max: [halfW, h, halfL]
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5123,
        count: 36,
        type: 'SCALAR'
      }
    ]
  };

  const jsonRaw = Buffer.from(JSON.stringify(gltfJson), 'utf8');
  const jsonPad = (4 - (jsonRaw.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonRaw, Buffer.alloc(jsonPad, 0x20)]);

  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF' magic
  header.writeUInt32LE(2, 4);          // version 2
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

const outDir = path.resolve(process.cwd(), 'public/models');
fs.mkdirSync(outDir, { recursive: true });

for (const profile of defaultVehicleRepository.getAllProfiles()) {
  const glb = buildGlbBuffer(profile);
  const outPath = path.join(outDir, `${profile.id}.glb`);
  fs.writeFileSync(outPath, glb);
  console.log(`Generated ${outPath} (${glb.length} bytes)`);
}
