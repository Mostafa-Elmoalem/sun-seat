/**
 * Development-only lab for the isolated microbus package (not part of the production build).
 * Open /model-lab.html while `npm run dev` runs.
 *
 * Query parameters:
 *   view    q (front three-quarter), s (door side), x (driver side), f (front), b (rear), top, seat
 *   sun     "relativeAngle,elevation" in degrees, relative to the nose (90 = door side)
 *   ref     a reference GLB in assets-src/hiace/ to show beside the model, scaled to the same length
 *   refRot  rotation of the reference about the vertical axis, degrees
 *   seat    seat id for the seat view
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildMicrobus, EGYPT_MICROBUS_14, loadShell } from '../../packages/egypt-microbus/src/index.ts';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'q';
const [relAngle, elevation] = (params.get('sun') ?? '250,32').split(',').map(Number) as [number, number];
const stage = document.getElementById('stage')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfdcec');
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const t0 = performance.now();
const shell = await loadShell(EGYPT_MICROBUS_14, '/models/egypt-microbus-shell.bin');
const model = buildMicrobus(EGYPT_MICROBUS_14, { envMap, destination: 'إسكندرية', shell });
const buildMs = performance.now() - t0;
scene.add(model.group);
if (params.get('hide') === '1') model.group.visible = false;

const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// The same lights as the app's VehicleScene.
scene.add(new THREE.HemisphereLight('#dfeaf7', '#6f6a60', 0.9));
const fill = new THREE.DirectionalLight('#dfe8f5', 0.5);
const sun = new THREE.DirectionalLight('#fff3dc', 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -7;
sun.shadow.camera.right = 7;
sun.shadow.camera.top = 7;
sun.shadow.camera.bottom = -7;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
const rel = THREE.MathUtils.degToRad(relAngle);
const el = THREE.MathUtils.degToRad(elevation);
// Relative angle: 0 = ahead of the nose (-Z), 90 = door side (+X).
const dir = new THREE.Vector3(Math.cos(el) * Math.sin(rel), Math.sin(el), -Math.cos(el) * Math.cos(rel));
sun.position.copy(dir.clone().multiplyScalar(30));
fill.position.set(-dir.x * 20, 12, -dir.z * 20);
scene.add(fill);
scene.add(sun, sun.target);

const camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.02, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
const L = EGYPT_MICROBUS_14.dimensions.lengthM;
const views: Record<string, [number, number, number]> = {
  q: [-4.6, 2.2, -5.2],
  s: [7.5, 1.4, 0.01],
  x: [-7.5, 1.4, 0.01],
  f: [0.01, 1.3, -7.5],
  b: [0.01, 1.4, 7.5],
  top: [0.01, 9.5, 1.5]
};
if (view === 'seat') {
  const id = Number(params.get('seat') ?? '5');
  const seat = EGYPT_MICROBUS_14.seats.find((s) => s.id === id)!;
  const head = model.toModel(seat.position.x, seat.position.y, seat.position.z + 0.8);
  model.setOccupied(id, false);
  camera.fov = 80;
  camera.position.copy(head);
  controls.target.copy(head).add(new THREE.Vector3(-0.5, -0.1, -0.6));
} else {
  camera.position.set(...(views[view] ?? views.q!));
  if (view === 'top') model.setCutaway(true);
}
const cam = params.get('cam');
if (cam) {
  camera.position.set(...(cam.split(',').map(Number) as [number, number, number]));
  controls.target.set(...((params.get('target') ?? '0,1,0').split(',').map(Number) as [number, number, number]));
  camera.fov = Number(params.get('fov') ?? '38');
}
if (params.get('cutaway') === '1') model.setCutaway(true);
camera.updateProjectionMatrix();
controls.update();

const refFile = params.get('ref');
if (refFile) {
  new GLTFLoader().load(`/assets-src/hiace/${refFile}`, (gltf) => {
    const ref = gltf.scene;
    ref.rotation.y = THREE.MathUtils.degToRad(Number(params.get('refRot') ?? '0'));
    const box = new THREE.Box3().setFromObject(ref);
    const size = box.getSize(new THREE.Vector3());
    const scale = L / Math.max(size.x, size.z);
    ref.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(ref);
    const [ox, oz] = (params.get('refAt') ?? (params.get('hide') === '1' ? '0,0' : '3.2,0')).split(',').map(Number) as [number, number];
    ref.position.set(ox - (box2.min.x + box2.max.x) / 2, -box2.min.y, oz - (box2.min.z + box2.max.z) / 2);
    console.info('ref size', box2.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(3)).join(' '));
    ref.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    scene.add(ref);
    render();
    document.title = `ready build=${buildMs.toFixed(0)}ms`;
  });
}

function render() {
  renderer.render(scene, camera);
}
controls.addEventListener('change', render);
addEventListener('resize', () => {
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  render();
});
render();
if (!refFile) document.title = `ready build=${buildMs.toFixed(0)}ms`;
