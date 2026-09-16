# Card templates and PDF export

Reference for turning the SVG card templates in `cards/` into a printable PDF in the browser.
The SVG files are the source of truth for geometry; this doc explains what the geometry means and
how to process it. If a number here disagrees with the SVG, trust the SVG and fix this doc.

## Decisions so far

- **Draw our own cards; don't fill `RecordSheets.pdf`.** That PDF is a flattened 300-dpi bitmap
  with no form fields and sideways cards. It's copyrighted (© 2009–2010 Chuck Hughes & Matthew
  Kilareski), so treat it as a style reference only and keep it out of the published site.
  The templates copy its layout and look without reusing its artwork.
- **Card art is SVG; the PDF is built with jsPDF + svg2pdf.js.** The same SVG drives the on-screen
  preview and the PDF, so output stays vector and sharp. The templates stay SVG files rather than
  React components (ADR 0002).
- **Two print sizes from one template.** "Large" (native size, for readability) and "Sleeve"
  (scaled to fit standard 2.5" × 3.5" card sleeves). The layout is identical; only the scale and
  page grid change.
- **One print size per job, mixed unit kinds allowed.** The whole Army List prints by default, and
  checkboxes leave units out. Every page uses the Mech/Vehicle slot grid, and a Troop card fills half
  a slot (see [Page layout](#page-layout)).
- **Sample data is invented.** The names and numbers in each template's `#data` group don't follow
  the game rules. Terms are defined in `CONTEXT.md`.

## Templates

| File | Native size | viewBox | Large page | Sleeve page |
|---|---|---|---|---|
| `cards/mech-card.svg` | 3.9" × 5.1" | 390 × 510 | 4-up (2 × 2) | 9-up (3 × 3) |
| `cards/vehicle-card.svg` | 3.9" × 5.1" | 390 × 510 | 4-up (2 × 2) | 9-up (3 × 3) |
| `cards/troops-card.svg` | 3.9" × 2.5" | 390 × 250 | 8-up (2 × 4) | 18-up (3 × 6) |

**Coordinates:** 1 viewBox unit = 0.01 inch = 0.72 pt. All positions below are in viewBox units.

### Page layout

US Letter (8.5" × 11"), portrait. Center the card grid on the page. Most home printers can't print
the outer ~0.25", so keep every card inside that margin. The card's black outer frame is the cut line.

Every page uses one **slot** grid. A Mech or Vehicle card fills one slot. A Troop card fills the top
or bottom half, so two Troops stack in a slot, with the vertical gutter between them. This lets
mixed unit kinds share a page. An odd Troop leaves the other half of its slot empty.

| Size | Slot size | Grid | Gutter (h / v) | Troop half-slot gap | Resulting margins (h / v) |
|---|---|---|---|---|---|
| Large | 3.9 × 5.1 | 2 × 2 | 0.2 / 0.2 | 0.1 | 0.25 / 0.3 |
| Sleeve | 2.5 × 3.27 (scale 0.641) | 3 × 3 | 0.15 / 0.15 | 0.064 | 0.35 / 0.445 |

Troop cards are 3.9 × 2.5 (Large) or 2.5 × 1.60 (Sleeve), so two plus the gap equal one slot height.
Sleeve scale = 2.5 / 3.9. Two sleeve-size Troop cards stacked fit one sleeve, as in the original sheets.
At sleeve scale, labels print at ~4 pt and values at ~5.5 pt. That's tiny but matches the original.

### SVG structure conventions

Every template has the same layers, in paint order:

1. `<g id="texture">`: stone background made with SVG filters (`#mottle`, `#streaks`), including
   the title panel's gray fill and mottle overlay, so the group holds everything filtered and nothing
   else. **These filters don't survive svg2pdf.**
   See [Texture](#texture).
2. Static artwork: boxes (`.box`), gray header bars (`.bar`), grid lines (`.gl`), heavy outlines
   (`.frame`), labels (`.lbl` 12px field labels, `.hdr` 9px bar headers, `.sm` small labels, `.num`
   grid numbers, `.title` card name).
3. `<g id="data">`: **sample** unit data. The app must empty this group and regenerate it. Each
   value is a `<text class="val" data-field="…">`. The crossed-out block is `<rect class="crossed">`
   plus an X `<path>`.

Label styling conventions:
- Abbreviations are small caps built from two sizes: `M<tspan font-size="9">V</tspan>:`.
- Mv, Tp, Sv and Hc print large and centered in their cell, not as a line under the label: they're
  read constantly in play.
- Fonts: `Alfa Slab One` for all artwork text, `Roboto Slab` weight 600 for filled-in values
  (`.val`). The templates load both via Google Fonts `@import`, which works only when the SVG is
  opened directly or inlined in the page. It doesn't work inside `<img>`.
- **Gotcha:** a CSS class rule beats an SVG presentation attribute. On an element that has a class,
  `font-size="5.5"` is ignored; use `style="font-size:5.5px"`. Plain `<tspan>`s have no class, so
  their attributes work. This catches the sample `#data` too: a `.val` there with a `font-size`
  attribute previews at 12px, which isn't what the app draws.

## Field map

Anchor = `x`,`y` of the `<text>` (baseline). "Center" means `text-anchor="middle"`. Box = the area
the value must stay inside: use its width minus ~8 units of padding as the max text width. Value
font is 12px unless noted.

**Padding on rows that print a full name.** Canvas `measureText` under-reports the width the browser
and svg2pdf actually lay out, by up to ~3% on a long string, so a value fitted right to the edge of
its box spills past it. The Vehicle mount rows and the Troop Crew Served Weapon row print names long
enough to reach that edge, so they take 8 more padding than the ~8 above. See issue #42.

Conventions across all cards:
- Rv prints as `normal/extended`, like `10/14`, or `min-normal/extended`, like `3-10/14`, in its single box. It stays blank for Support Equipment with no range.
- Only Mechs track heat, so only the Mech card has Hc and Hv. Hv stays blank when the entry generates none.
- Each weapon row has a **Dp area** where the entry's Dp is drawn (see [Dp](#dp)). The areas hold no
  artwork but their surrounding box: the app draws the shape itself.
- The Vehicle and Troop cards keep the label "Type" for the value the app calls Class.

### Mech (`mech-card.svg`)

| data-field | Anchor | Box (x1–x2 × y1–y2) | Notes |
|---|---|---|---|
| `bp` | 211, 46 center, 16px | 172–250 × 12–54 | |
| `name` | 258, 42 | 254–378 × 12–48 | |
| `class` | 258, 78 | 254–378 × 48–84 | |
| `mv` | 316, 110 center, 22px | 254–378 × 84–120 | |
| `tp` | 316, 146 center, 22px | 254–378 × 120–156 | |
| `hc` | 316, 182 center, 22px | 254–378 × 156–192 | |
| `armor` | 258, 222 | 254–378 × 192–228 | Also drives the armor cross-out |
| `notes` | 258, 260, 11px | 254–378 × 228–422 | Multi-line: `<tspan x="258" dy="14">`, ≤ 12 lines |
| `la-rv` / `la-hv` | 101 / 144, 464 center, 11px | 80–123 / 123–166 × 440–469 | Left arm |
| `ra-rv` / `ra-hv` | 284 / 327, 464 center, 11px | 263–306 / 306–349 × 440–469 | Right arm |
| `lt-rv` / `lt-hv` | 101 / 144, 493 center, 11px | 80–123 / 123–166 × 469–498 | Left torso |
| `rt-rv` / `rt-hv` | 284 / 327, 493 center, 11px | 263–306 / 306–349 × 469–498 | Right torso |
| `la-weapon` / `lt-weapon` | 15, 464 / 493, 10px | 12–80 × 440–469 / 469–498 | Weapon or Support Equipment short name, under the hardpoint label |
| `ra-weapon` / `rt-weapon` | 198, 464 / 493, 10px | 195–263 × 440–469 / 469–498 | Weapon or Support Equipment short name, under the hardpoint label |

An empty hardpoint leaves its `*-weapon`, `*-rv` and `*-hv` fields out. A Hardpoint row's short name,
Rv and Hv share one baseline, 464 or 493, so the three line up.

**Illegal marks.** A printed card is taken as Legal at the table, so a Unit Profile with Issues
prints with three marks. A Legal card has none of them.

| Mark | Position | Notes |
|---|---|---|
| `<g data-mark="illegal">` | Triangle 364–376 × 15–26 | Warning triangle beside the name, in the empty end of the NAME label row |
| `<g data-mark="la-illegal">`, `ra-`, `lt-`, `rt-` | Triangle 67–78 / 250–261 × 455–465 (arms) or 484–494 (torsos) | On each Hardpoint row with an Issue, at the right of the weapon line. The row's `*-weapon` fits 48 wide instead of 60 |
| `illegal` data-field | 258, 260, 10px | `ILLEGAL: <Issue>` for one Issue, `ILLEGAL: 2 issues` for several. Emboldened with a 0.6 stroke in the fill color (only weight 600 is bundled), which svg2pdf draws as text render mode 2. Wraps like `notes`, 0.6 narrower, ≤ 2 lines; `notes` starts `dy="14"` below its last line and keeps the remaining lines of the 12 |

A warning triangle is a black path with a white `!` drawn as shapes, so it needs no font. The line
stays 10px while `notes` is 11px, because its wordings are short enough to fit this narrow box on one
line only at that size. One Issue's
wording is short to leave room for notes: `HL too heavy`, `ECTS on an arm` (short names),
`Left Arm not in Catalog` (the name may be long), `Bp over max` or `Bp is 0`.

Armor grid: rows are 150, 140, …, 10 from top to bottom. Row *i* (0-based) spans y = 90 + 20*i* to
110 + 20*i*. Hit-location columns span x = 44–250 (10 × 20.6).

### Vehicle (`vehicle-card.svg`)

| data-field | Anchor | Box | Notes |
|---|---|---|---|
| `bp` | 211, 46 center, 16px | 172–250 × 12–54 | |
| `name` | 258, 44 | 254–378 × 12–58 | |
| `type` | 258, 90 | 254–378 × 58–104 | |
| `mv` | 316, 136 center, 24px | 254–378 × 104–150 | |
| `tp` | 316, 182 center, 24px | 254–378 × 150–196 | |
| `armor` | 258, 228 | 254–378 × 196–242 | Also drives the armor cross-out |
| `illegal` | 16, 277, 11px | 12–378 × 246–400 | Only with Issues: `ILLEGAL: …`, emboldened and wrapped like the Mech's, ≤ 2 lines |
| `cargo-bays` | 16, 277 + 14 per line above, 11px | 12–378 × 246–400 | Only with Cargo Bays: `Cargo Bay ×N`, one line below `illegal` |
| `notes` | 16, 277 + 14 per line above, 11px | 12–378 × 246–400 | Multi-line: `dy="14"`. The three fields share 9 lines; `notes` gets what's left |
| `mount1-weapon` / `mount2-weapon` | 16, 455 / 486, 14px | 12–232 × 435–466 / 466–498 | Mount row: label and full name, `Turret: Light Laser` or `Static: Light Machine Gun`. Wraps: see below |
| `mount1-rv` / `mount2-rv` | 276, 457 / 488 center, 16px | 232–320 × 435–466 / 466–498 | The row's Rv, blank for Support Equipment with no range |

**Mount rows.** The row is wide enough for the entry's full name, so it prints that rather than the
short name; only the `ILLEGAL` line is tight enough to need short names. A name too wide for one line
**wraps** to a second rather than shrinking away: at 11.5px, `dy="12.5"`, ≤ 2 lines, with the first
baseline 6 above the single-line one (449 / 480). The row is only 31 tall, so the wrapped pair sets
smaller and tighter than a single line; 14px is for the one-line case alone. The box under the
`WEAPON / EQUIPMENT:` and `RV:` labels holds two rows. Only
filled mounts print, one per row from the top, in the order Turret, Static Mount slot 1, Static
Mount slot 2; a Hull Option the Vehicle doesn't take prints nothing. A Legal Vehicle fills at most
two, so the extra mounts of an illegal Vehicle that fills three are dropped (its `ILLEGAL` line
still counts their Issues). A name missing from the Catalog has no short name, so its row prints the
name as stored, with a blank Rv.

**Illegal marks.** As on the Mech, a Legal card has none.

| Mark | Position | Notes |
|---|---|---|
| `<g data-mark="illegal">` | Triangle 364–376 × 15–26 | Beside the name, as on the Mech |
| `<g data-mark="mount1-illegal">`, `mount2-` | Triangle 217–228 × 446–456 / 477–487 | On each mount row with an Issue, at the right of the weapon line. The row's `*-weapon` fits 196 wide instead of 212 |

One Issue's wording: `Hull Options over`, `Turret: Md Laser too heavy`, `Static: Plasma Lance not in
Catalog`, `Bp over max` or `Bp is 0`. Both Static Mount slots are labeled `Static`.

Armor grid: rows are 60 … 10. Row *i* spans y = 90 + 20*i* to 110 + 20*i*; columns x = 44–250.

### Troops (`troops-card.svg`)

| data-field | Anchor | Box | Notes |
|---|---|---|---|
| `bp` | 211, 43 center, 16px | 172–250 × 12–50 | |
| `name` | 258, 44 | 254–378 × 12–57.2 | |
| `type` | 258, 89.2 | 254–378 × 57.2–102.4 | The Troop Class in full, `Heavy Infantry` |
| `mv` | 316, 134.4 center, 24px | 254–378 × 102.4–147.6 | |
| `tp` | 316, 179.6 center, 24px | 254–378 × 147.6–192.8 | |
| `sv` | 316, 224.8 center, 24px | 254–378 × 192.8–238 | Also drives the strength cross-out |
| `illegal` | 16, 143, 10px | 12–250 × 113–164 | Only with Issues: `ILLEGAL: …`, emboldened like the Mech's, **1 line** |
| `standard-equipment` | 16, 143 + 13 per line above, 10px | 12–250 × 113–164 | One line: `Individual Weapons` or `Individual Weapons, Jump Packs` |
| `notes` | 16, 143 + 13 per line above, 10px | 12–250 × 113–164 | Multi-line: `dy="13"`. The three fields share **2 lines**; `notes` gets what's left, cut off with "…", and is left out when none are |
| `weapon` | 15, 214, 13px | 12–155 × 182–238 | The Crew Served Weapon's full name, 128 wide. Wraps to a 2nd line at the same size, `dy="14"`, first baseline 210 |
| `rv` | 184.5, 220 center, 16px | 155–214 × 182–238 | Blank for Support Equipment with no range |

**Crew Served Weapon.** Only a filled Crew Served Weapon prints `weapon` and `rv`. The row is wide
enough for the full name, so it prints that; only the `ILLEGAL` line uses short names. Unlike the
Vehicle's mount row, this one has the height to keep a wrapped pair at full size. A name missing
from the Catalog prints as stored, with a blank Rv. Standard Equipment isn't
stored: it follows from the Troop Class.

**Illegal marks.** As on the Mech, a Legal card has none.

| Mark | Position | Notes |
|---|---|---|
| `<g data-mark="illegal">` | Triangle 364–376 × 15–26 | Beside the name, as on the Mech |
| `<g data-mark="weapon-illegal">` | Triangle 140–151 × 205–215 | On the Crew Served Weapon row when it has an Issue, at the right of the weapon line. `weapon` fits 120 wide instead of 136 |

One Issue's wording: `Md Laser too heavy` (short name), `Plasma Lance not in Catalog`, `Bp over max`.

Strength tracker: box *n* (1–20) is in column *c* = (*n* − 1) mod 10 and row *r* = floor((*n* − 1) / 10).
It spans x = 12 + 23.8*c* to 35.8 + 23.8*c*, and y = 68–88.5 (row 0) or 88.5–109 (row 1).
Every box above Sv is crossed out, one block per row: Sv 5 crosses out boxes 6–10 (x = 131–250) and
all of row 1; Sv 10 crosses out row 1.

## Dp

A Weapon's Dp is stored in the Catalog as a compact string and drawn as solid boxes, the way the
rules' weapon table prints it. `CONTEXT.md` defines Dp, Impact Box and Rolls.

**Notation** (the `dp` column of `catalog.csv`): an optional `N x` roll count, then one digit per
row, top to bottom, giving how many boxes that row holds. `331` is three rows of 3, 3 and 1; `5x11`
is 5 Rolls of a two-row, one-box-wide shape. Every row is odd, since a shape is symmetric about its
center column, and the whole shape fits the entry's Class: 3×3 Light, 4×4 Medium, 5×5 Heavy. A
Weapon must have a Dp; Support Equipment must leave the cell blank. The Catalog loader rejects
anything else, so a typo fails the build.

**Drawing.** Each row's Dp is a `<g data-dp="…">` in `#data`, named for the row (`la`, `mount1`,
`weapon`), holding one `<rect>` per box and, with Rolls, a `<text data-field="…-rolls">`.
Boxes are squares of a fixed size per card, with a gap of 20% of the box between them.
The Impact Box (top row center) is black; every other box is `#888`. Rolls print as `N×` in Roboto
Slab 600 to the left of the shape, vertically centered on it, at the size of that card's weapon name.
Shape and text together are centered in the Dp area. Only Machine Guns have Rolls, and their shapes
are one box wide, so the text always fits.

| Card | Dp area (x1–x2 × y1–y2) | Grid | Cell | `N×` size |
|---|---|---|---|---|
| Mech | 166–195 / 349–378 × 440–469 (arms), 469–498 (torsos) | 5×5 | 5.8 | 9px |
| Vehicle | 320–378 × 435–466 (mount 1), 466–498 (mount 2) | 4×4 | 7.75 | 11px |
| Troops | 214–250 × 182–238 | 3×3 | 12 | 11px |

The box size is the area's smaller side divided by the grid, so a Light Laser is the same size on
every row of a card rather than stretched to fill its area. That size is the **cell**: the square
plus the gap that follows it, which is why the largest shape the grid holds still fits the area
(five Mech cells are 29, and the shape spans 29 less the trailing gap). The square itself is the
cell less that gap, 4.83 on a Mech.

An empty mount, a Support Equipment and a name missing from the Catalog all print nothing, like a
blank Rv. An illegal Unit Profile can mount a Weapon too heavy for its card's grid (a Heavy Laser on
a Vehicle is 5 rows in a 4×4 area): shrink that row's boxes until the shape fits rather than clipping
it. The card is already marked illegal.

**Templates.** No Dp area holds artwork but its surrounding box, and none takes a `DP:` label. The
hand-drawn placeholder grids the areas once held — the Mech's `#minigrid` def and its four `<use>`s,
the Vehicle's 6×8 grid path and the Troops' 6×9 grid path — came out when the app took over the
drawing, so those areas are deliberately empty. The Vehicle's Dp column is one box spanning both
mount rows; the two Dp areas line up with the mount rows, leaving the 418–435 label strip empty.

## Processing: unit data → PDF

1. **Load the template** by importing it as raw text (`import mechSvg from '../../cards/mech-card.svg?raw'`)
   and parse it with `DOMParser`. Remove the Google Fonts `@import` from the parsed copy; the app
   supplies the fonts (see [Fonts](#fonts)). This happens in the framework-free card builder, and
   its output feeds both the preview and the PDF (ADR 0002).
2. **Empty `#data`** and rebuild it from the unit's values. Set text with `textContent`, which
   escapes user input safely.
3. **Fit text.**
   - Single-line fields: measure the text. If it's wider than the box, shrink the font in steps
     down to ~8px, then truncate with "…".
   - `notes` and `weapon`: word-wrap to the box width, one `<tspan>` per line, and cap the line
     count from the field map.
   - Measure with the same font the PDF uses: canvas `measureText()` in `600 <size>px "Roboto Slab"`
     once the card fonts have loaded. This needs no in-DOM SVG, so the fitting logic takes the
     measure function as a parameter and is tested in Node with a fake one.
4. **Cross out unused capacity.** Draw one `rect.crossed` per contiguous block, plus an X path
   corner to corner across the block (see the sample `#data` groups).
   - Mech/Vehicle armor grid: cross out every row whose value is greater than `armor`. A block
     spans x = 44–250 from the top row down.
   - Troops strength tracker: cross out boxes *n* > Sv. Sv 5 covers part of row 0 and all of row 1,
     so draw one rect per row.
5. **Draw each Dp** (see [Dp](#dp)): one `<rect>` per box in the row's Dp area, plus the `N×` text
   when the entry has Rolls. Pure geometry, so it's tested in Node.
6. **Texture** (see below): replace the filter-based texture before handing the SVG to svg2pdf.
7. **Place on the page:**
   `const doc = new jsPDF({ unit: 'pt', format: 'letter' })`, then for each card draw the texture
   image and then `await svg2pdf(svgEl, doc, { x, y, width, height })`, with position and size in
   pt (the doc's unit, verified) from the page layout table (scale 1.0 or 0.641). Cards keep list
   order: a Troop takes the bottom half of the slot when the card before it is a Troop in that slot's
   top half, and otherwise the top half of the next slot. Add a page when the grid fills.
8. **Download** with `doc.save('mech-attack-cards.pdf')`.

### Texture

svg2pdf ignores `<filter>`, so the texture has to become an image:

- Build a texture-only SVG per card type: `<defs>` plus the `#texture` group, no text. Render it
  through `new Image()` with a blob URL onto a canvas at 200 dpi. Filters do render in `<img>`;
  only the web fonts don't, and this SVG has no text.
- Paint the canvas white first, then export JPEG to keep the PDF small. JPEG has no alpha, so the
  rounded corners outside `#cardClip` would otherwise turn black. Cache one per card type.
- Remove `#texture` from the export copy and draw the image first with
  `doc.addImage(data, 'JPEG', x, y, w, h, alias)`. With a fixed `alias`, jsPDF embeds the image
  once no matter how many cards use it.

### Fonts

- The app self-hosts one set of font files for everything: Alfa Slab One Regular and Roboto Slab
  SemiBold (600), static TTFs (SIL OFL and Apache 2.0; licenses alongside), bundled in
  `src/assets/fonts/`. The card builder adds them to the page with the `FontFace` API (preview and
  text measurement) and jsPDF embeds the same files (export), so text that fits in the preview fits
  in the PDF.
- The `@import` in the templates is for opening an SVG on its own (see
  [Previewing a template](#previewing-a-template)). It does nothing for svg2pdf, and the card
  builder removes it.
- Register each with jsPDF (`addFileToVFS` + `addFont`) under the exact family names used in the
  SVG CSS, **passing the weight**: `addFont(file, 'Roboto Slab', 'normal', 600)`. svg2pdf looks
  fonts up by a style key built from `font-weight` (`'normal'` for 400, `'600normal'` for 600). A
  font registered under any other key is silently replaced by Times-Roman. The font still shows as
  embedded, but its width table is empty (`/W []`), which the export test checks for.
- Verified with svg2pdf 2.8: in-file `<style>` class rules apply, and `<use>` (`#hit-numbers`)
  renders. No inlining is needed.

## Previewing a template

Headless Chromium (from the Playwright cache) screenshots an SVG with web fonts loaded:

```sh
~/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell \
  --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=375,490 --virtual-time-budget=8000 \
  --screenshot=/path/to/out.png file://$PWD/cards/mech-card.svg
```

Use window height 490 for Mech/Vehicle and 240 for Troops. The screenshot is 2× the window size.

## Settled rules

- Armor is always a multiple of 10. Cross out every armor row above it.
- Troop Sv is 5 or 10, set by its Troop Class. Cross out every strength box above it; players mark
  damage on the rest.
- The Critical Systems Area row is static artwork. Its numbers repeat the column numbers so hits
  are easier to mark, and it never takes printed data.

## Pending design sessions

Don't build against the current guesses for these:

- **Weapon eligibility by Class for Vehicles:** which Weapons each Class may mount.
  Settled for Mechs and Troops (see `CONTEXT.md`).
- **Unit construction for Vehicles:** base stats, upgrades and Bp. Settled for Mechs and Troops:
  Bp, Mv, Tp and Hc or Sv are worked out and print in the same fields (see `CONTEXT.md`).
