# egypt-microbus

The Egyptian 14-seat microbus, the Chinese HiAce H100 family that fills Egyptian terminals (King Long / Golden Dragon, Jinbei Haise, Foton View), as a three.js model.

Everything comes from one plain-data spec (`src/spec.ts`, no three.js import): the body silhouette, the real window openings, the seats with their backrest heights, the driver and the dashboard. A renderer draws from it and a physics engine can read the very same numbers, so the picture and the calculation cannot disagree. In the app "اقعد فين؟" the sun-exposure engine ray-traces through exactly these windows.

## Use

```ts
import { buildMicrobus, loadShell, EGYPT_MICROBUS_14 } from 'egypt-microbus';

// The body shell: download the precomputed file, or cut it on this device as a fallback.
const shell = await loadShell(EGYPT_MICROBUS_14, '/models/egypt-microbus-shell.bin');

const bus = buildMicrobus(EGYPT_MICROBUS_14, {
  shell,
  envMap,                  // optional reflections on paint, chrome and glass (exterior only)
  destination: 'إسكندرية', // the hand-written card behind the windshield, or null
  quality: 'high',         // 'low' on phones: no clearcoat, cheaper shaders
  merge: true              // merge static parts per material (a few dozen draw calls)
});
scene.add(bus.group);

bus.setOccupied(5, false); // empty seat 5 (0 is the driver)
bus.setCutaway(true);      // hide the roof but keep its shadow, for a view from above
bus.setDestination('رمسيس');
const p = bus.toModel(x, y, z); // vehicle frame to model coordinates
bus.dispose();
```

`bus.parts` exposes the body, skirt, roof pieces, glass panes (`Glass_<window id>`), wheels, details, cabin, one marker group per seat (`Seat_01` to `Seat_14`, `Seat_Driver`) and the instanced passengers.

## Frames

- Vehicle frame, in meters: `x` across (negative is the driver side, left), `y` from the front bumper towards the rear, `z` up from the ground.
- Model (three.js): `X = x`, `Y = z`, `Z = y - length / 2`. The nose points at -Z, the door side at +X, the ground is at Y = 0.

## The shell

The body is cut by constructive solid geometry (a rounded solid from the side silhouette, minus the cabin, the window openings and the wheel arches), with material slots for the skin, the inner walls, the window reveals and the wheel wells. Cutting takes seconds on a phone, so ship it precomputed:

```sh
node scripts/build-microbus-shell.mts   # writes public/models/egypt-microbus-shell.bin (about 64 KB gzipped)
```

`loadShell` falls back to `cutShell`, which loads the CSG code (`three-bvh-csg`, `three-mesh-bvh`) only at that moment; a page that ships the file never downloads it. Rerun the script after any change to `spec.ts` or `body.ts`; a unit test fails when the committed file no longer matches the spec.

## Performance notes

- `merge: true` bakes every static part that shares a material into one mesh (about 45 meshes instead of 205).
- Only the exterior materials take the environment map, so reflections never wash out the sun patches inside the cabin.
- `quality: 'low'` swaps the physical (clearcoat) materials for standard ones; the first frame compiles far fewer and simpler shaders.

## Credits

- Overall size and wheelbase: Golden Dragon 14-seat spec sheet (4,980 x 1,700 x 1,970 mm, wheelbase 2,590 mm).
- Side silhouette and front and rear profile: measured from "Toyota Hiace 1995" by elenaisakova248 (Sketchfab, CC BY 4.0), modified: lengthened by 0.51 m and rebuilt as a parametric solid. Any app that shows this model must credit it visibly.
- Seat layout and the back bench against the rear door: confirmed by the product owner.

The license for this package is for its owner to choose; until then it is private.
