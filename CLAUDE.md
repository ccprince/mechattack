# Mech Attack list builder

Browser-only web app, hosted on GitHub Pages, that builds Army Lists for the Mech Attack game and
prints them as PDF record cards (Mech, Vehicle, Troops). There's no server: everything, including
PDF generation, runs client-side.

- `CONTEXT.md` is the domain glossary (Army List, Unit Profile, Weapon, Bp, Dp…). Use its terms and
  capitalization. Decisions are recorded in `docs/adr/`.
- `cards/*.svg` are the card templates. **Card templates, field positions, cross-outs, print sizes
  or PDF export:** read `docs/cards.md` first.
- `RecordSheets.pdf` is the original copyrighted record sheet, used as a style reference only.
  Keep it out of the published site.

## Stack

React + Vite + TypeScript, built by GitHub Actions and deployed to Pages from `dist/`. Code is layered;
each layer imports only from the layers above it:

1. `src/domain`: Army List types, Zod schemas, reducer, migrations, Weapon Catalog. Pure; tested in Node.
2. `src/cards`: turns a Unit Profile into card SVG (text fitting, cross-outs, page slots). No React.
3. `src/pdf`: jsPDF + svg2pdf export. Lazy-loaded when printing.
4. `src/ui`: React components with `useReducer` + Context, styled with CSS Modules.

Tests: Vitest runs pure logic in Node. Anything that measures text or renders SVG/PDF runs in Vitest
browser mode (Playwright). Keep geometry in pure functions so most tests stay in Node.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `ccprince/mechattack` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
