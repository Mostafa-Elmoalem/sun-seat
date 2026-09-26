---
version: 1
slug: "src-ui-app-tsx"
primary_target: "src/ui/App.tsx"
related_targets: ["src/ui"]
---

# Surface: trip input and result (src/ui)

Scope: the whole app surface, input screen and result screen. Mode: Operate.
Audience: riders at a microbus terminal in direct sun, one hand, weak data; video viewers trying their own trip.
Task: pick from, to, date and time, vehicle; read which side (ناحية السواق / ناحية الباب) and which seat; optionally inspect why (route, sun, timeline, 3D).
Constraints: see PRODUCT.md. First screen is the form. Arabic RTL first; vehicle diagrams never mirrored.

## Direction contract

THESIS: The answer is a solved geography homework. The route is inked on graph paper, the sun angle is measured with a protractor against the road, and the teacher circles the best seat in red. It refuses the weather-app sky gradient, glass cards and emoji-studded chips.

OWN-WORLD: Bright white 5 mm graph paper with a red margin rule on the right (RTL). Ballpoint blue ink for all text and primary actions, graphite for secondary text and construction lines, teacher red only for the verdict mark and errors, fluorescent highlighter yellow only for sun. Shade is clean paper plus blue ink hatching. Controls are ruled lines, ink-filled pills and stamped buttons. Ruq'ah handwriting appears only in short teacher annotations; every functional string is a sturdy Arabic sans.

STORY: The rider understands that the site measured their real road against the real sun, believes it because the construction is visible, and sits on the circled side.

FIRST VIEWPORT: A notebook page. Top: brand line and the date line ("التاريخ" doubles as the date and time input). Middle: "من" and "إلى" written on ruled lines with search, GPS as an ink icon; vehicle as two drawn silhouettes. Bottom thumb zone: a full-width ink-blue stamped button "حلّها". Result: the red-circled verdict "اقعد ناحية الباب" at 40px+ first, the plan-view microbus with the best seats circled, then a protractor figure, the trip ruler, the route figure, the 3D figure.

FORM: Egyptian school geography notebook (كشكول الجغرافيا), position 4 on the ordered list, seed key eb3be8d0. Raises: pencil hatching density as a color-free sun carrier (from exposure record); designed absence for shade and night (from seven-segment); color only on marks, text stays ink (from iridescent cloud); loading as a self-completing pencil sketch (from cloud quarry).

Signature interaction: the verdict is drawn: the route inks itself along the grid, the protractor swings to the sun angle, and the red circle is drawn around the answer. Motion grammar: pen strokes (stroke-dashoffset), under 700 ms, skipped under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
