# Mech Attack card printer

Browser-only web app, hosted on GitHub Pages, that generates printable PDF record cards (Mech,
Vehicle, Troops) for the Mech Attack game. There's no server: everything, including PDF generation,
runs client-side.

- `CONTEXT.md` is the domain glossary (Army List, Unit Profile, Weapon, Bp, Dp…). Use its terms and
  capitalization. Decisions are recorded in `docs/adr/`.
- `cards/*.svg` are the card templates. **Card templates, field positions, cross-outs, print sizes
  or PDF export:** read `docs/cards.md` first.
- `RecordSheets.pdf` is the original copyrighted record sheet, used as a style reference only.
  Keep it out of the published site.
