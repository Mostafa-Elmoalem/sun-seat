import * as THREE from 'three';
import type { MicrobusSpec } from './spec.ts';
import type { MicrobusMaterials } from './materials.ts';

/**
 * Four wheels: a lathed tire with rounded shoulders and sidewalls, a steel rim
 * with six vent holes and a chrome hub cap, like the 14 inch wheels on
 * Egyptian microbuses.
 */
export function buildWheels(spec: MicrobusSpec, m: MicrobusMaterials, track: (g: THREE.BufferGeometry) => THREE.BufferGeometry): THREE.Group {
  const { radius: R, width, halfTrack, frontAxleY, rearAxleY } = spec.wheels;
  const L = spec.dimensions.lengthM;
  const hw = width / 2;
  const rimR = R * 0.58;

  // Tire cross-section (radius, axial offset), revolved around the axle.
  const section: [number, number][] = [
    [rimR, -hw * 0.86],
    [rimR + (R - rimR) * 0.35, -hw],
    [R - 0.035, -hw * 0.97],
    [R - 0.008, -hw * 0.78],
    [R, -hw * 0.5],
    [R + 0.003, 0],
    [R, hw * 0.5],
    [R - 0.008, hw * 0.78],
    [R - 0.035, hw * 0.97],
    [rimR + (R - rimR) * 0.35, hw],
    [rimR, hw * 0.86]
  ];
  const tireGeo = track(new THREE.LatheGeometry(section.map(([r, y]) => new THREE.Vector2(r, y)), 40));
  tireGeo.rotateZ(Math.PI / 2);

  const barrelGeo = track(new THREE.CylinderGeometry(rimR, rimR, width * 0.86, 32, 1, true));
  barrelGeo.rotateZ(Math.PI / 2);

  const face = new THREE.Shape();
  face.absarc(0, 0, rimR * 0.98, 0, Math.PI * 2, false);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hole = new THREE.Path();
    hole.absarc(Math.cos(a) * rimR * 0.62, Math.sin(a) * rimR * 0.62, rimR * 0.15, 0, Math.PI * 2, true);
    face.holes.push(hole);
  }
  const faceGeo = track(new THREE.ExtrudeGeometry(face, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 24 }));
  faceGeo.rotateY(Math.PI / 2);

  const drumGeo = track(new THREE.CylinderGeometry(rimR * 0.9, rimR * 0.9, 0.02, 24));
  drumGeo.rotateZ(Math.PI / 2);
  const capGeo = track(new THREE.SphereGeometry(rimR * 0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  // A shallow dome: flatten the hemisphere along its height, then point it outwards along X.
  capGeo.scale(1, 0.45, 1);
  capGeo.rotateZ(-Math.PI / 2);

  const wheels = new THREE.Group();
  wheels.name = 'Wheels';
  for (const axle of [frontAxleY, rearAxleY]) {
    for (const side of [-1, 1]) {
      const w = new THREE.Group();
      w.name = `Wheel_${axle === frontAxleY ? 'front' : 'rear'}_${side < 0 ? 'left' : 'right'}`;
      w.position.set(side * halfTrack, R, axle - L / 2);
      const tire = new THREE.Mesh(tireGeo, m.tire);
      const barrel = new THREE.Mesh(barrelGeo, m.rim);
      const drum = new THREE.Mesh(drumGeo, m.trim);
      drum.position.x = side * -0.02;
      const rimFace = new THREE.Mesh(faceGeo, m.rim);
      // Face sits flush with the outer edge of the rim barrel.
      rimFace.position.x = side * (width * 0.43 - 0.012);
      if (side < 0) rimFace.rotation.y = Math.PI;
      const cap = new THREE.Mesh(capGeo, m.chrome);
      cap.position.x = side * (width * 0.43 + 0.004);
      if (side < 0) cap.rotation.y = Math.PI;
      for (const part of [tire, barrel, rimFace, cap]) {
        part.castShadow = true;
        part.receiveShadow = true;
      }
      w.add(tire, barrel, drum, rimFace, cap);
      wheels.add(w);
    }
  }
  return wheels;
}
