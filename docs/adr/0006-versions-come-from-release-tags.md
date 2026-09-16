# Versions come from release tags; every merge still deploys

The footer names a build as its last release, how far past it the build is, and its short commit SHA:
`v0.1.0 · 7854429` for a release, `v0.1.0+3 · ad66406` for a build three commits later. A release links
to its GitHub Release notes; a build between releases links to the compare view from the release to its
commit, which lists exactly what has been merged since. Before this the footer showed only the SHA
(ADR 0005). A SHA identifies a build exactly, which a bug report needs, but it can't tell a player who
checks back after a month whether anything changed, or what.

The version lives only in git tags. The `build` script reads `git describe --tags --long --always
--match 'v*'` into `VITE_BUILD`, and `src/ui/buildLabel.ts` turns that into the label. With no release
tag in the history, as in a fork or a tagless clone, the label is the bare SHA; with no git, `dev`.
`package.json` has no `version` field: the package is private, and a field nobody reads would drift and
invite someone to fix it by hand.

A release is a tag on a commit already on `main`, created with release notes by `gh release create
vX.Y.Z --target main --generate-notes` (steps in `CLAUDE.md`). Deploys don't wait for it: every merge
still goes live, and the tag says "this is a coherent thing to tell players about". A feature built
across several pull requests goes out one at a time, so each pull request must be shippable on its own
— working and not misleading, if incomplete — and the release that follows the last one lists them all.

Deploying only on tags was the alternative. The live site would always be an exact release, but every
change would need a second, manual step to reach players, for an app with no accounts and nothing to
break for them except saved Army Lists, which migrations already protect. A build-time flag to hide
unfinished work stays available if one pull request ever can't be shippable alone.

Pushing a `v*` tag also runs the deploy workflow, which rebuilds the commit already live so its footer
shows the clean version rather than the `+N` it was deployed with. The checkout fetches full history so
`git describe` can see the tags, and the `github-pages` environment must allow `v*` tags as well as
`main`. The deploy step gives Pages a build version unique to the run: `deploy-pages` uses the
commit SHA, and Pages silently keeps the first deploy of a version, so a tag on a commit its merge
already deployed would otherwise change nothing.

## Numbering

Versions start at `v0.1.0`. Before 1.0, a minor version is a new feature or anything a player has to act
on, and a patch is fixes only. From `1.0.0`, a major version is a change a player has to act on, such as
saved Army Lists or printed cards changing in a way they'd notice. What has to land before 1.0 is the
`1.0.0` milestone in GitHub Issues, not this record, because scope is planning and changes.

## Consequences

- The footer answers both "which build is this?" and "what changed?", and the SHA stays copyable.
- Release notes are the changelog; nothing extra ships in `dist/`.
- A release costs one extra CI run, rebuilding a commit that is already live.
