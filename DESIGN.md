---
name: اقعد فين؟
description: The answer to "which side stays out of the sun", worked out in a geography notebook.
colors:
  paper: "#fbfcfe"
  desk: "#e9edf3"
  grid: "#e9eef6"
  grid-strong: "#d8e0ec"
  margin-rule: "#f0c3c9"
  ink: "#1b2f7c"
  ink-hover: "#243c95"
  ink-soft: "#3d55a8"
  ink-wash: "#e8edf9"
  ink-press: "#dde4f6"
  text: "#1d2126"
  graphite: "#555c66"
  pencil: "#8f98a4"
  pencil-light: "#c3cad3"
  teacher-red: "#cc1f37"
  highlighter: "#ffe03a"
  highlighter-deep: "#f5b800"
  highlighter-soft: "#fff4b8"
  highlighter-ink: "#6b4d00"
typography:
  verdict:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "clamp(36px, 10.4vw, 48px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.4
  field:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  control:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  xs: "6px"
  sm: "10px"
  control: "12px"
  md: "14px"
  pill: "999px"
spacing:
  cell: "20px"
  gutter: "16px"
  block: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    height: "60px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    height: "60px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 14px"
  button-outline-hover:
    backgroundColor: "{colors.ink-wash}"
  button-outline-pressed:
    backgroundColor: "{colors.ink-press}"
  segmented:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "3px"
  segmented-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    height: "44px"
  segmented-secondary-selected:
    backgroundColor: "{colors.ink-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  seat-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    size: "48px"
  seat-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 16px"
  pill-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  line-field:
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    height: "64px"
  ink-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "60px"
    padding: "6px 12px"
---

# Design System: اقعد فين؟

## Overview

**Creative North Star: "The Geography Notebook" (كراسة الجغرافيا)**

The answer is a solved homework problem. Every screen is a page of 5 mm graph paper with a red margin rule on the reading-start edge. The rider's trip is written on ruled lines in ballpoint ink, the road is inked on the grid, the sun angle is measured with a protractor, and the teacher circles the right answer in red. The world belongs to the audience: Egyptian students know this notebook, this ink and this red pen by heart.

It is an Operate surface first. The page is bright and high contrast because it is read at a microbus terminal in direct sun; the notebook is a way of showing the working, never decoration in the way of the answer. Color is scarce and always means something: ink is information, red is the answer or an error, highlighter is sun. The pictures carry the answer and the words stay few: one verdict, one short line, then one stage where the seats, the 3D microbus and the road all follow the same time bar.

**Key Characteristics:**
- Bright cool paper with a faint measuring grid; text is dark ink, never gray-on-gray
- One filled ink button per screen, full width, in the thumb zone; every other action is an outlined ink button with a label
- The verdict circled by a red pen stroke; best seats ringed the same way
- One stage: a switch, the chosen picture, and the time bar right under it, all on one phone screen
- Sun drawn with highlighter fill plus hatching whose density grows with exposure
- Vehicle diagrams, the 3D view and maps drawn as crisp geometry, never mirrored by RTL

## Colors

A restrained notebook palette: paper and ink carry the page, and three marking colors each have exactly one job.

### Primary
- **Ballpoint Ink** (ink): all headings, entered values, buttons, selection and focus. Its hover step (ink-hover), pressed step (ink-press) and wash (ink-wash) are the only states; the lighter ink-soft is for focus rings and construction lines.

### Secondary
- **Teacher Red** (teacher-red): the ring around the verdict, the rings and borders of the best seats, the scrub cursor on the time bar, the protractor angle, and error text. Nothing else.

### Tertiary
- **Highlighter** (highlighter, highlighter-deep, highlighter-soft): sun only. Seats and time bar bands in the sun, the sun disc, its rim and its rays. Highlighter-ink draws the hatching over sunny seats. Never used for text, never used as a generic accent.

### Neutral
- **Graph Paper** (paper): the page, every input surface and every button ground.
- **Desk** (desk): the surface around the page on wide screens.
- **Grid Lines** (grid, grid-strong): the 20 px measuring grid and the rule above a picture's foot.
- **Margin Rule** (margin-rule): the single vertical rule on the reading-start edge.
- **Printed Text** (text): body copy and place names in lists.
- **Graphite** (graphite): secondary text, labels, hints, empty field prompts (6.5:1 on paper).
- **Pencil** (pencil, pencil-light): construction lines, idle borders, picture frames and ticks only; never text.

### Named Rules
**The One Job Rule.** Red means "this is the answer" or "this is wrong". Yellow means "sun is here". If a color is doing anything else, it is wrong.

**The Shade Is Paper Rule.** Shade has no color of its own. A seat in shade is clean paper with its number in ink and the word "ضل" under it; absence is drawn deliberately, not left blank.

## Typography

**UI Font:** Readex Pro (self-hosted, variable 160 to 700, Arabic and Latin subsets) with Noto Sans Arabic, Segoe UI and Tahoma as fallbacks
**Card Lettering:** Aref Ruqaa 700 (Ruq'ah), Arabic subset, loaded only with the 3D view

**Character:** A sturdy, open Arabic sans that survives glare does every job on the page. Ruq'ah appears only where Egyptian microbuses really carry it: the handwritten destination card behind the 3D windshield.

### Hierarchy
- **Verdict** (700, clamp 36 to 48 px, 1.2): the answer, once per result, circled in red. It reaches 40 px from 385 px wide and steps down below that so the verdict keeps one line at 360 px.
- **Title** (700, 19 px, 1.4): the primary button label and block headings.
- **Field** (600, 19 px, 1.35): values written on the from and to lines.
- **Body** (400, 17 px, 1.7): the one short line under the verdict.
- **Control** (600, 15 px, 1.3): every button, segment and pill, and the trip route in the result bar.
- **Label** (600, 13 px): picture labels, side names, captions, time bar ends.
- **Caption** (400, 12 to 12.5 px): the legend, the trip day and time, the footer. Time bar lane names drop to 11.5 px and are the smallest text on the page.

### Named Rules
**The Card Only Rule.** Ruq'ah lives on the microbus's destination card in 3D. No string the rider reads, compares or taps is set in it.

## Layout

Single column on phones inside a page at most 520 px wide, with a 16 px gutter plus the margin rule on the reading-start side. The form stacks from, to, GPS, when, vehicle, and puts the one primary action last, in the thumb zone. The result reads answer first: the result bar (edit, trip summary, share), the verdict and its one line, the best seats, then the stage, then the working folded away, then one action. Blocks are separated by 20 px of paper, not by cards.

The stage is one area: a segmented switch (seats, 3D, road) directly above the chosen picture, and the time bar directly under it. The picture's height is set so switch, picture and time bar fit one phone screen (clamp 320 px to 600 px, the viewport less 236 px). From 760 px the page widens to 1120 px, the seats sit beside the 3D or the road (0.85 to 1.15 columns) with a compact switch above the side column, the picture grows (clamp 440 px to 620 px, the viewport less 320 px), and one time bar spans both. At 420 px and below the result bar buttons tighten so the trip summary keeps its two lines. From 560 px the page lifts off the desk.

### Named Rules
**The Unmirrored Figure Rule.** Seat plans, the 3D view and the route map are laid out left to right in every language: the driver side is on the left because it is on the left. Only text around them follows RTL; the time bar runs in reading direction because it is time, not space.

**The Switch Above, Time Below Rule.** A switch sits directly above the one area it changes, and the time bar sits directly under the picture it drives. Nothing that moves a picture lives a scroll away from it.

## Elevation & Depth

Flat paper. Depth comes from ink weight and frames, not shadows. The page lifts slightly off the desk on wide screens, the primary button carries a soft ink-tinted drop so it reads as the one thing to press, and the 3D view switch floats over the canvas. Sheets and toasts use a soft, blurred drop because they genuinely float.

### Shadow Vocabulary
- **Page on desk** (`0 1px 2px rgba(27,47,124,0.08), 0 18px 40px -18px rgba(27,47,124,0.25)`): the notebook page on screens 560 px and wider.
- **Primary action** (`0 8px 20px -8px rgba(27,47,124,0.55)`): the full-width ink button only.
- **Over the 3D** (`0 6px 16px -8px rgba(27,47,124,0.35)`): the view switch floating on the 3D canvas.
- **Sheet** (`0 24px 60px -24px rgba(27,47,124,0.45)`): the place sheet on wide screens.
- **Floating** (`0 12px 28px -10px rgba(0,0,0,0.45)`): toasts.

## Shapes

Gently rounded, like cut paper and plastic geometry-set tools: 14 px for the primary button, the segmented switch and every picture frame; 12 px for outlined buttons and seat chips; 10 px for inputs and the segments inside a switch, with seat cushions drawn at a matching 9 unit radius in the plan; 6 px for the page corner on the desk and the paper ground under a label on the 3D; full pills for choice chips and circles for round buttons. Fields are not boxes: from and to are ruled lines (2 px underline) with the value written on them. Each picture sits in one 1.5 px pencil-light frame; nothing wraps the stage itself.

## Components

### Buttons
- **Primary:** ink background, paper text, Title type, 60 px tall, full width, 14 px radius. One per screen.
- **Secondary:** paper background with a 2 px ink border, same size, for the one alternative ending such as "احسب مشوار تاني".
- **Outlined:** every other action (edit, share, language, open the 3D, back to the whole trip): paper, 1.5 px ink border, 12 px radius, 48 px tall, icon plus a word. Hover ink-wash, pressed ink-press.
- **Round:** a 48 px outlined circle, used for play and pause on the time bar.
- **Focus:** 3 px ink-soft outline on every control; the primary button presses 1 px down.

### Segmented Control
Switches what the area right under it shows. Paper with a 1.5 px ink border, 14 px radius and 3 px inset; segments 44 px tall (40 px compact) at 10 px radius, the chosen one filled with ink. Over the 3D canvas it is secondary: a pencil-light border and the chosen segment in ink-wash with a 1.5 px inset ink outline, never a second filled bar.

### Chips
- **Seat chips:** the best seats as 48 px squares, 12 px radius, 2 px teacher-red border, ink number; the chosen one fills with ink. Tapping one selects that seat in every picture.
- **Choice pills:** paper, 1.5 px pencil border, ink text, 48 px tall; chosen fills with ink. Time quick picks sit in an equal three-column grid.

### Inputs / Fields
- **Ruled line field:** tag in graphite, value in ink Field type, 2 px pencil-light underline turning ink-soft on hover and focus, red when invalid. Opens the full-screen place sheet.
- **Ink input (date, time):** paper box, 2 px pencil-light border, graphite label over an ink value, native picker underneath.
- **Error:** teacher-red text with an info glyph; the offending line turns red.

### Navigation
A top bar with the brand mark and name in ink on the reading-start side and an outlined language button on the other. The result bar holds an outlined edit button, the trip summary on two lines (the route in Control type with an arrow in reading direction; the day and time in Caption graphite, each piece kept whole) and an outlined share button.

### The Stage (signature)
One area for every picture. Each picture has a head: a plain Label in graphite that says what it shows ("الرحلة كلها" or the chosen minute), on a 6 px paper ground where it sits over the 3D. While a minute is chosen, an outlined "الرحلة كلها" button in the same head goes back to the whole trip. Labels are words, never boxed.

### Seat Plan (signature)
Plan view of the actual vehicle profile. Seats are rounded cushions: paper in shade, highlighter in sun at strengths that follow the minutes, with hatching at three densities over the fill. Seat number in ink, the trip's sun minutes under it, or "ضل" below the shade threshold. In the whole-trip view the best seats get a red pen ring; the chosen seat a 3.2 px ink outline. The sun is drawn outside the body at its bearing as a disc with three parallel rays pointing in. Side names sit level above each flank. A legend and the chosen seat's line sit in the picture's foot.

### Time Bar (signature)
Time runs in reading direction. The driver-side band sits above an ink axis with ticks and the door-side band below, highlighted where the sun comes from that side, with the lane names beside them and a round play button at the start. The drawing stretches to any width (one 1000 unit field, strokes kept at their weight); a red dashed cursor marks the minute every picture shows, with its dot hollow for the default minute and filled once the rider picks one. The whole bar is the drag target; departure and arrival times sit under it.

### Route Figure with Protractor (signature)
The road inked on the page's own grid, north up, start as an open ink ring and end as a filled one, drawn to the picture's own shape. At the shown minute a protractor ring with 15 degree ticks (radius 40 to 60 px, growing with the picture) is centered on the vehicle, with the road heading as an ink arrow, the sun as a highlighter disc and ray, and the angle between them in red. One caption line gives the source, the distance and the road heading.

### 3D Microbus
Loads after the answer is on screen and stays built, paused, behind the other pictures. Three views, switched by the secondary control: from above (roof cut away, seat numbers, red rings, and the ground sun marker, a disc with a rim and three rays toward the cabin, always inside the frame), from outside (a front three-quarter from the sunny flank, with the sun as a rimmed disc on a small dome around the van so it stays in frame), and from the chosen seat (the sun and its dashed day arc in the sky). On a weak connection it waits behind an outlined "افتح العربية 3D" button with its size written under it.

## Do's and Don'ts

### Do:
- **Do** name sides "ناحية السواق" and "ناحية الباب"; never شمال or يمين for a side, and never ناحية for a compass direction.
- **Do** keep every functional string in ink or text color on paper; graphite is the lightest text allowed.
- **Do** mark sun with highlighter plus hatching so it still reads when the screen washes out.
- **Do** keep touch targets at 48 px or more and the primary action at the bottom of the form.
- **Do** put a switch directly above what it switches and the time bar directly under the picture it drives.
- **Do** draw diagrams as exact vector geometry: rulers, rings, arrows, plans.

### Don't:
- **Don't** mirror vehicle diagrams, the 3D view or maps for RTL.
- **Don't** use red or yellow for anything but the answer, errors and sun.
- **Don't** put content in stacked or nested cards; blocks and the stage sit on the paper, and only a picture gets a frame.
- **Don't** box or border text that does not act; a border means "you can press this".
- **Don't** use emoji or Unicode glyphs as icons; icons are the authored 1.9 stroke SVG set.
- **Don't** use em dashes or en dashes in any copy.
