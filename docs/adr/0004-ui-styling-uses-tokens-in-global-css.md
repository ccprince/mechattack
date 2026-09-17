# UI styling uses design tokens in global.css

`src/ui/global.css` holds the whole visual vocabulary: custom properties on `:root` for type, ink and
surfaces, spacing, radius, border and focus ring, plus base styles for the bare elements the UI uses
(`button`, `input`, `select`, `textarea`, `fieldset`, `legend`). A CSS Module styles the layout of its
own component — grids, flex rows, widths — and takes every colour, type size and spacing value from a
token.

Before this, each module decided independently. Secondary text was `#555` in two files; two different
reds were in use (`#a31515` and `#b3261e`) for the same "over a limit" meaning; a field label was
`0.85rem` in one module and `0.8rem` in another; gaps were picked per component from six different
values; and `UnitProfileEditor.module.css` patched control defaults (`font: inherit`) that every other
form in the app needed too. Nothing was wrong on screen, but no change could be made in one place.

Tokens are named for their role, not their value: `--danger` rather than `--red`, `--surface-sunken`
rather than `--grey-100`. That is what lets the dark palette be a second set of values for the same
names, and it keeps a module from reaching for a colour that happens to look right.

The display and value fonts are the card fonts, `Alfa Slab One` and `Roboto Slab`, which
`src/cards/fonts.ts` already loads into the document to measure card text. The app title uses the
display font and worked-out values (stats, the Bp total) use the value font, so the editor reads like
the card it prints. They load asynchronously, so they are only used where a flash of fallback text
doesn't matter — never for body text, labels or controls.

The UI font, `IBM Plex Sans`, and the heading font, `Barlow Condensed`, are a separate pair (#89),
bundled from `@fontsource` and imported in `main.tsx` rather than fetched from a font service, so the
site works offline and asks no third party for anything. They're declared with `font-display: swap`,
so the body shows in the system font for the moment before they arrive. Headings (Unit Profile
sections, fieldset legends, dialog titles) use the heading font; everything else uses the UI font.

## Consequences

- A visual change is made once, in `global.css`, and the whole UI follows.
- A dark palette, and any later theme, is a set of token overrides; no module needs to change. The
  one thing that doesn't follow the scheme is the card preview, a proof of the printed page: it holds
  its white `--paper`, the token the dark palette leaves alone.
- Contrast is a token property, so it's checked as one: `src/ui/tokens.test.ts` reads `global.css` and
  holds every pair the UI stacks to WCAG AA, in both palettes. A new pairing goes in that list.
- New components must not introduce a literal colour, type size or spacing value. Where one is
  genuinely local to a component — an optical baseline nudge, the card preview's paper shadow — it
  carries a comment saying so.
- Restyling never touches the tests: they query by role and accessible name, so markup and class names
  are free to change underneath them.
