---
version: 1
slug: "src-ui-app-tsx"
primary_target: "src/ui/App.tsx"
related_targets: ["src/ui"]
---

# Surface: trip input and result (src/ui)

Scope: the whole app surface, input screen and result screen. Mode: Operate.
Audience: riders at a microbus terminal in direct sun, one hand, weak data; video viewers trying their own trip; phones first, tablets too.
Task: pick from, to, date and time, vehicle; read which side (ناحية السواق / ناحية الباب), which seats, and which end to avoid; optionally watch the sun move (trip strip, 3D).
Constraints: see PRODUCT.md. First screen is the form. Arabic RTL first; vehicle diagrams never mirrored. Owner notes (September 2026): the notebook looked childish; less text, the picture carries the answer with a short explanation; the 3D is visible on the result but renders after the instant answer; phone and tablet.

## Direction contract

THESIS: The result is the view from behind a mashrabiya: cool deep shade is the ground of every picture, and sunlight appears only where the engine says it lands, as lattice light on the exact seats. It refuses the weather-app sky gradient, sun icons on glass cards, and the notebook.

OWN-WORLD: Lime-plaster page (#f2f3ef) for reading, ink #0e1a1c, shade teal #123e44 for the verdict and the one primary action. Pictures sit in deep-shade windows (#0f2b30) framed by turned-wood lattice lines (#2a5a60). Sun is amber light only (#ffc247, hot core #ff9f1c, light #ffe3a3), drawn as lattice dots whose count is the dose. Best seats glow plaster-white inside the window. Reem Kufi (Fatimid Kufi) for the verdict and big numbers, Readex Pro for everything else, tabular figures.

STORY: The rider sees their microbus from above with light falling on real seats, believes it because the light moves with the time, and sits in the cool cells.

FIRST VIEWPORT: Form: brand and EN toggle; one plaster slab with من and إلى and swap and GPS; departure time big with a sun-height lattice; vehicle silhouettes; full-width shade-teal button pinned in the thumb zone. Result: verdict in Reem Kufi 44px, one short line, best-seat badges, then the shade window (plan, lattice dots, whole-trip label) with the trip strip at its foot; the 3D window loads beneath.

FORM: Cairo mashrabiya light and shade, position 5 on the ordered list, seed key d2aa1e46. Raises: tabular numbers and two-value verdict contrast (from Ikeda); literal region labels (from industrial quote grammar); the verdict never shrinks (from TDR); one dominant field per screen (from gravity garden); real objects, not icons (from skeuomorph).

Signature interaction: scrubbing the trip strip slides the light across the lattice seats and the 3D as the sun moves along the route; on arrival the light blooms into the cells from the sun's side. Motion grammar: light bloom (opacity and scale of lattice dots), under 600 ms, instant under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
