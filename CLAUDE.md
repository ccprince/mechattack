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

1. `src/domain`: Army List types, Zod schemas, reducer, migrations, Catalog. Pure; tested in Node.
2. `src/cards`: turns a Unit Profile into card SVG (text fitting, cross-outs, page slots). No React.
3. `src/pdf`: jsPDF + svg2pdf export. Lazy-loaded when printing.
4. `src/ui`: React components with `useReducer` + Context, styled with CSS Modules.

Tests: Vitest runs pure logic in Node. Anything that measures text or renders SVG/PDF runs in Vitest
browser mode (Playwright). Keep geometry in pure functions so most tests stay in Node.

## Git workflow

`main` only moves by merging pull requests; a pre-commit hook in `.githooks/` refuses commits on it
(`npm install` enables the hook). Start every piece of work on its own branch:

1. `git switch main && git pull --ff-only`
2. `git switch -c <kebab-case-name>`, e.g. `editor-ui-tests`. Uncommitted changes carry over.
3. Commit, `git push -u origin HEAD`, then `gh pr create`.
4. After the merge: `git switch main && git pull --ff-only && git branch -d <name>`.

Every merge to `main` deploys, so each pull request must be shippable on its own: working and not
misleading, even if a feature spans several. Only the last of those says "Closes #N"; earlier ones say
"Part of #N".

### Releasing

Versions come only from `v*` tags (ADR 0006); there's no `version` in `package.json`. A release is cut
by label, not by hand:

- A ready issue carries one of `release: patch`, `release: minor`, `release: major`, `release: none`.
- A pull request copies it from the issues it closes. Change or remove it on the pull request;
  `release: none` keeps it from being copied back.
- Merging a pull request labelled patch, minor or major creates that release with generated notes,
  then builds and deploys it.

Before 1.0: minor for a new feature or anything a player must act on, patch for fixes only. To release
by hand, `gh release create vX.Y.Z --target main --generate-notes`; the tag push redeploys.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `ccprince/mechattack` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
