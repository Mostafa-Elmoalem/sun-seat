---
name: اقعد فين؟
description: The answer to "which side stays out of the sun", worked out in a geography notebook.
colors:
  paper: "#fbfcfe"
  desk: "#e9edf3"
  grid: "#e1e8f2"
  grid-strong: "#d2dcea"
  margin-rule: "#eba3ac"
  ink: "#1b2f7c"
  ink-hover: "#243c95"
  ink-soft: "#3d55a8"
  ink-wash: "#e8edf9"
  text: "#1d2126"
  graphite: "#555c66"
  pencil: "#8f98a4"
  pencil-light: "#c3cad3"
  teacher-red: "#cc1f37"
  highlighter: "#ffe03a"
  highlighter-deep: "#f5b800"
  highlighter-soft: "#fff4b8"
typography:
  verdict:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "clamp(34px, 10vw, 46px)"
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
  label:
    fontFamily: "Readex Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.6
  teacher-note:
    fontFamily: "Aref Ruqaa, Readex Pro, serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: "10px"
  md: "14px"
  pill: "999px"
spacing:
  cell: "20px"
  gutter: "16px"
  block: "22px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.field}"
    rounded: "{rounded.md}"
    height: "60px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "60px"
  pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
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

The answer is a solved homework problem. Every screen is a page of 5 mm graph paper with a red margin rule on the reading-start edge. The rider's trip is written on ruled lines in ballpoint ink, the road is inked on the grid, the sun angle is measured with a protractor, and the teacher circles the right answer in red. The world belongs to the audience: Egyptian students know this notebook, this ink and this red pen by heart, and the launch video asks "ايه اهمية الجغرافيا اصلا؟".

It is an Operate surface first. The page is bright and high contrast because it is read at a microbus terminal in direct sun; the notebook is a way of showing the working, never decoration in the way of the answer. Color is scarce and always means something: ink is information, red is the answer or an error, highlighter is sun.

**Key Characteristics:**
- Bright cool paper with a faint measuring grid; text is dark ink, never gray-on-gray
- One primary action per screen, full width, in the thumb zone
- The verdict circled by a red pen stroke; best seats ringed the same way
- Sun drawn with highlighter fill plus graphite hatching whose density grows with exposure
- Vehicle diagrams, rulers and maps drawn as crisp vector geometry, never mirrored by RTL

## Colors

A restrained notebook palette: paper and ink carry the page, and three marking colors each have exactly one job.

### Primary
- **Ballpoint Ink** (ink): all headings, entered values, primary buttons, selection and focus. Its hover step (ink-hover) and the lighter ink-soft are for focus rings and construction lines.

### Secondary
- **Teacher Red** (teacher-red): the ring around the verdict, the rings around the best seats, the scrub cursor on the ruler, the protractor angle, and error text. Nothing else.

### Tertiary
- **Highlighter** (highlighter, highlighter-deep, highlighter-soft): sun only. Seats and ruler bands in the sun, the sun disc and its rays. Never used for text, never used as a generic accent.

### Neutral
- **Graph Paper** (paper): the page and every input surface.
- **Desk** (desk): the surface around the page on wide screens.
- **Grid Lines** (grid, grid-strong): the 20 px measuring grid and figure dividers.
- **Margin Rule** (margin-rule): the single vertical rule on the reading-start edge.
- **Printed Text** (text): body copy and place names in lists.
- **Graphite** (graphite): secondary text, labels, hints, empty field prompts (6.5:1 on paper).
- **Pencil** (pencil, pencil-light): construction lines, idle borders and ruler ticks only; never text.

### Named Rules
**The One Job Rule.** Red means "this is the answer" or "this is wrong". Yellow means "sun is here". If a color is doing anything else, it is wrong.

**The Shade Is Paper Rule.** Shade has no color of its own. A seat in shade is clean paper with its number in ink; absence is drawn deliberately, not left blank.

## Typography

**UI Font:** Readex Pro (self-hosted, variable 160 to 700, Arabic and Latin subsets) with Noto Sans Arabic, Segoe UI and Tahoma as fallbacks
**Annotation Font:** Aref Ruqaa 700 (Ruq'ah, the hand Egyptian students write in), Arabic subset

**Character:** A sturdy, open Arabic sans that survives glare does every functional job; the Ruq'ah hand appears only as the teacher's short margin note.

### Hierarchy
- **Verdict** (700, clamp 34 to 46 px, 1.2): the answer, once per result, circled in red.
- **Title** (700, 19 px, 1.4): block headings on the result page.
- **Field** (600, 19 px, 1.35): values written on the from and to lines, and the primary button label.
- **Body** (400, 17 px, 1.7): the one-sentence reason under the verdict, capped near 38ch.
- **Label** (600, 13 px): field tags, section labels, figure captions and hints.
- **Teacher Note** (Aref Ruqaa 700, 22 px): "أحسن كراسي" and similar two to five word notes.

### Named Rules
**The Teacher Writes Little Rule.** Ruq'ah is for notes of five words or fewer. Anything a rider must parse, compare or act on is set in Readex Pro.

**The Tabular Numbers Rule.** Times, minutes and seat numbers use tabular figures so columns and rulers line up.

## Layout

Single column on phones inside a page at most 520 px wide, with a 16 px gutter plus the margin rule on the reading-start side. The form stacks from, to, GPS, when, vehicle, and puts the one primary action last, in the thumb zone. The result reads answer first: verdict, best seats, seat plan, then side comparison and caveats, then the trip ruler, the route figure, the 3D figure and the working. From 980 px the result page widens to 980 px and splits into two columns (answer and seats; ruler, route, 3D, working). Blocks are separated by 22 px of paper, not by cards; more space sits above a heading than below it.

### Named Rules
**The Unmirrored Figure Rule.** Seat plans, the 3D slot and the route map are laid out left to right in every language: the driver side is on the left because it is on the left. Only text around them follows RTL; the trip ruler runs in reading direction because it is time, not space.

## Elevation & Depth

Flat paper. Depth comes from ink weight, not shadows. Two shadows exist: the page lifts slightly off the desk on wide screens, and the primary button carries a soft ink-tinted drop so it reads as the one thing to press. Sheets and toasts use a soft, blurred drop because they genuinely float.

### Shadow Vocabulary
- **Page on desk** (`0 1px 2px rgba(27,47,124,0.08), 0 18px 40px -18px rgba(27,47,124,0.25)`): the notebook page on screens 560 px and wider.
- **Primary action** (`0 8px 20px -8px rgba(27,47,124,0.55)`): the full-width ink button only.
- **Floating** (`0 12px 28px -10px rgba(0,0,0,0.45)`): toasts.

## Shapes

Gently rounded, like cut paper and plastic geometry-set tools: 14 px for buttons, figures and seat detail; 10 px for inputs and seat cushions; full pills for choice chips. Fields are not boxes: from and to are ruled lines (2 px underline) with the value written on them. Figures (route, 3D) sit in a 1.5 px pencil-light frame with a caption strip under a grid-strong rule.

## Components

### Buttons
- **Shape:** gently rounded (14 px), full width, 60 px tall.
- **Primary:** ink background, paper text, Field type. One per screen.
- **Hover / Focus:** ink-hover background; 3 px ink-soft focus outline; presses 1 px down.
- **Secondary:** paper background with a 2 px ink border, used for "open the 3D view".
- **Icon buttons:** 48 by 48 minimum, ink glyph, ink-wash on hover.

### Chips
- **Style:** paper pill, 1.5 px pencil-light border, ink text, 48 px tall.
- **State:** selected fills with ink and turns the text paper. Time quick picks sit in an equal three-column grid.

### Inputs / Fields
- **Ruled line field:** tag in graphite, value in ink Field type, 2 px pencil-light underline turning ink-soft on hover and focus, red when invalid. Opens the full-screen place sheet.
- **Ink input (date, time):** paper box, 2 px pencil-light border, graphite label over an ink value, native picker underneath.
- **Error:** teacher-red text with an info glyph; the offending line turns red.

### Navigation
A top bar with the brand mark and name in ink on the reading-start side and a 48 px language toggle on the other. The result bar holds edit, the trip summary (with an SVG arrow in reading direction) and share.

### Seat Plan (signature)
Plan view of the actual vehicle profile. Seats are 10 px rounded cushions: paper in shade, three highlighter strengths in sun, with graphite hatching at three densities over the fill. Seat number in ink, minutes of sun under it. Best seats get a red pen ring; the selected seat a 3.2 px ink outline. The sun is drawn outside the body at its bearing with three parallel yellow rays pointing in. Side names sit level above each flank.

### Trip Ruler (signature)
Time runs in reading direction along an ink axis with tick marks; the driver-side band sits above the axis and the door-side band below, highlighted where the sun comes from that side. A red cursor marks the moment every figure shows, and the whole ruler is the drag target.

### Route Figure with Protractor (signature)
The road inked on the page's own grid, north up, start as an open ink ring and end as a filled one. At the shown moment a protractor ring with 15 degree ticks is centered on the vehicle, with the road heading as an ink arrow, the sun as a yellow disc and ray, and the angle between them in red.

## Do's and Don'ts

### Do:
- **Do** name sides "ناحية السواق" and "ناحية الباب"; never شمال or يمين for a side.
- **Do** keep every functional string in ink or text color on paper; graphite is the lightest text allowed.
- **Do** mark sun with highlighter plus hatching so it still reads when the screen washes out.
- **Do** keep touch targets at 48 px or more and the primary action at the bottom of the form.
- **Do** draw diagrams as exact vector geometry: rulers, rings, arrows, plans.

### Don't:
- **Don't** mirror vehicle diagrams, the 3D view or maps for RTL.
- **Don't** use red or yellow for anything but the answer, errors and sun.
- **Don't** put content in stacked cards or card grids; blocks sit on the paper.
- **Don't** use emoji or Unicode glyphs as icons; icons are the authored 1.9 stroke SVG set.
- **Don't** use em dashes or en dashes in any copy.
