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
- Fonts: `Alfa Slab One` for all artwork text, `Roboto Slab` weight 600 for filled-in values
  (`.val`). The templates load both via Google Fonts `@import`, which works only when the SVG is
  opened directly or inlined in the page. It doesn't work inside `<img>`.
- **Gotcha:** a CSS class rule beats an SVG presentation attribute. On an element that has a class,
  `font-size="5.5"` is ignored; use `style="font-size:5.5px"`. Plain `<tspan>`s have no class, so
  their attributes work.

## Field map

Anchor = `x`,`y` of the `<text>` (baseline). "Center" means `text-anchor="middle"`. Box = the area
the value must stay inside: use its width minus ~8 units of padding as the max text width. Value
font is 12px unless noted.

Conventions across all cards:
- Rv prints as `normal/extended`, like `10/14`, or `min-normal/extended`, like `3-10/14`, in its single box. It stays blank for Support Equipment with no range.
- Only Mechs track heat, so only the Mech card has Hc and Hv. Hv stays blank when the entry generates none.
- The small hand-drawn grids next to each weapon (5×5 on the Mech in the template) are placeholders.
  They'll be replaced by printed **Dp** at 5×5 (Mech), 4×4 (Vehicle) and 3×3 (Troop). The layout
  is **pending the Dp design session**.
- The Vehicle and Troop cards keep the label "Type" for the value the app calls Class.

### Mech (`mech-card.svg`)

| data-field | Anchor | Box (x1–x2 × y1–y2) | Notes |
|---|---|---|---|
| `bp` | 211, 46 center, 16px | 172–250 × 12–54 | |
| `name` | 258, 42 | 254–378 × 12–48 | |
| `class` | 258, 78 | 254–378 × 48–84 | |
| `mv` | 258, 114 | 254–378 × 84–120 | |
| `tp` | 258, 150 | 254–378 × 120–156 | |
| `hc` | 258, 186 | 254–378 × 156–192 | |
| `armor` | 258, 222 | 254–378 × 192–228 | Also drives the armor cross-out |
| `notes` | 258, 260, 10px | 254–378 × 228–422 | Multi-line: `<tspan x="258" dy="14">`, ≤ 12 lines |
| `la-rv` / `la-hv` | 101 / 144, 467 center, 11px | 80–123 / 123–166 × 440–469 | Left arm |
| `ra-rv` / `ra-hv` | 284 / 327, 467 center, 11px | 263–306 / 306–349 × 440–469 | Right arm |
| `lt-rv` / `lt-hv` | 101 / 144, 496 center, 11px | 80–123 / 123–166 × 469–498 | Left torso |
| `rt-rv` / `rt-hv` | 284 / 327, 496 center, 11px | 263–306 / 306–349 × 469–498 | Right torso |
| `la-weapon` / `lt-weapon` | 15, 464 / 493, 9px | 12–80 × 440–469 / 469–498 | Weapon or Support Equipment short name, under the hardpoint label |
| `ra-weapon` / `rt-weapon` | 198, 464 / 493, 9px | 195–263 × 440–469 / 469–498 | Weapon or Support Equipment short name, under the hardpoint label |

An empty hardpoint leaves its `*-weapon`, `*-rv` and `*-hv` fields out.
Armor grid: rows are 150, 140, …, 10 from top to bottom. Row *i* (0-based) spans y = 90 + 20*i* to
110 + 20*i*. Hit-location columns span x = 44–250 (10 × 20.6).

### Vehicle (`vehicle-card.svg`)

| data-field | Anchor | Box | Notes |
|---|---|---|---|
| `bp` | 211, 46 center, 16px | 172–250 × 12–54 | |
| `name` | 258, 44 | 254–378 × 12–58 | |
| `type` | 258, 90 | 254–378 × 58–104 | |
| `mv` | 258, 136 | 254–378 × 104–150 | |
| `tp` | 258, 182 | 254–378 × 150–196 | |
| `armor` | 258, 228 | 254–378 × 196–242 | Also drives the armor cross-out |
| `notes` | 16, 277, 10px | 12–378 × 246–400 | Multi-line: `dy="14"`, ≤ 9 lines |
| `weapon` | 16, 451, 11px | 12–232 × 418–498 | Turret/cargo bay weapon or equipment; 3 lines fit at `dy="14"`. **Pending the Hull Options session:** a Vehicle can have a Turret, a Static Weapon Mount and a Cargo Bay, so this single box may change. |
| `rv` | 276, 466 center, 16px | 232–320 × 418–498 | |

Armor grid: rows are 60 … 10. Row *i* spans y = 90 + 20*i* to 110 + 20*i*; columns x = 44–250.

### Troops (`troops-card.svg`)

| data-field | Anchor | Box | Notes |
|---|---|---|---|
| `bp` | 211, 43 center, 16px | 172–250 × 12–50 | |
| `name` | 258, 44 | 254–378 × 12–57.2 | |
| `type` | 258, 89.2 | 254–378 × 57.2–102.4 | |
| `mv` | 258, 134.4 | 254–378 × 102.4–147.6 | |
| `tp` | 258, 179.6 | 254–378 × 147.6–192.8 | |
| `sv` | 258, 224.8 | 254–378 × 192.8–238 | |
| `notes` | 16, 143, 10px | 12–250 × 113–164 | Multi-line: `dy="13"`, **≤ 2 lines** |
| `weapon` | 15, 214, 11px | 12–155 × 182–238 | Crew-served weapon |
| `rv` | 184.5, 220 center, 16px | 155–214 × 182–238 | |

Strength tracker: box *n* (1–20) is in column *c* = (*n* − 1) mod 10 and row *r* = floor((*n* − 1) / 10).
It spans x = 12 + 23.8*c* to 35.8 + 23.8*c*, and y = 68–88.5 (row 0) or 88.5–109 (row 1).

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
   - Troops strength tracker: cross out boxes *n* > starting strength. If strength < 10 this covers
     part of row 0 and all of row 1, so draw one rect per row.
5. **Texture** (see below): replace the filter-based texture before handing the SVG to svg2pdf.
6. **Place on the page:**
   `const doc = new jsPDF({ unit: 'pt', format: 'letter' })`, then for each card draw the texture
   image and then `await svg2pdf(svgEl, doc, { x, y, width, height })`, with position and size in
   pt (the doc's unit, verified) from the page layout table (scale 1.0 or 0.641). Put each Troop card
   in a free half slot, and add a page when the grid fills.
7. **Download** with `doc.save('mech-attack-cards.pdf')`.

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
- Verified with svg2pdf 2.8: in-file `<style>` class rules apply, and `<use>` (`#hit-numbers`,
  `#minigrid`) renders. No inlining is needed.

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
- Troop Sv is at most 20. Cross out every strength box above it; players mark damage on the rest.
- The Critical Systems Area row is static artwork. Its numbers repeat the column numbers so hits
  are easier to mark, and it never takes printed data.

## Pending design sessions

Don't build against the current guesses for these:

- **Dp:** how a Damage Profile is stored and drawn, including multiplier boxes. It replaces the
  hand-drawn grids.
- **Vehicle Hull Options:** Turret, Static Weapon Mount and Cargo Bay, and how the Vehicle card shows them.
- **Weapon eligibility by Class:** which Weapons each Class may mount.
- **Bp formulas and per-Class Bp limits.** Until then, Bp is typed in.
