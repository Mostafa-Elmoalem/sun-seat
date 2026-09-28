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
Constraints: see PRODUCT.md. First screen is the form. Arabic RTL first; vehicle diagrams never mirrored. Owner refinement (September 2026): keep the notebook world but less strange and less childish; action buttons must read as buttons; far less scattered text; the one time control must sit with the pictures it moves (seats, 3D, route) instead of pages away.

## Direction contract

THESIS: The answer is a solved geography homework. The route is inked on graph paper, the sun angle is measured with a protractor against the road, and the teacher circles the best seat in red. It refuses the weather-app sky gradient, glass cards and emoji-studded chips.

OWN-WORLD: Bright white 5 mm graph paper with a red margin rule on the right (RTL). Ballpoint blue ink for all text and primary actions, graphite for secondary text and construction lines, teacher red only for the verdict mark and errors, fluorescent highlighter yellow only for sun. Shade is clean paper plus blue ink hatching. Controls are ruled lines, ink-filled pills and stamped buttons. Ruq'ah handwriting appears only in short teacher annotations; every functional string is a sturdy Arabic sans.

STORY: The rider understands that the site measured their real road against the real sun, believes it because the construction is visible, and sits on the circled side.

FIRST VIEWPORT: Form: a notebook page with the brand line, من and إلى on ruled lines with swap and GPS, the time and day with three quick chips, two vehicle silhouettes, and one full-width ink button in the thumb zone. Result: the red-circled verdict at 40px+, one short line, a highlighter note when the back bench or front row takes the sun, the best seats as ink number buttons; then one stage that fits a phone screen: a segmented switch (الكراسي, العربية 3D, الطريق), a label saying الرحلة كلها or the exact minute, the chosen picture, and the time bar right under it with play. From 760px the seats and the 3D sit side by side over the same time bar. The working folds away below.

FORM: Egyptian school geography notebook (كشكول الجغرافيا), position 4 on the ordered list, seed key eb3be8d0. Raises: pencil hatching density as a color-free sun carrier (from exposure record); designed absence for shade and night (from seven-segment); color only on marks, text stays ink (from iridescent cloud); loading as a self-completing pencil sketch (from cloud quarry).

Signature interaction: one time bar moves every picture: drag or play it and the hatching slides across the seats, the sun swings around the 3D microbus and the protractor turns on the route, all in the same stage without scrolling. Motion grammar: pen strokes (stroke-dashoffset) for the verdict ring and route, under 700 ms, skipped under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
