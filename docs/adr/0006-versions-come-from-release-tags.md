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

A release is a tag on a commit already on `main`, with release notes generated from the pull requests
since the last one. Deploys don't wait for it: every merge still goes live, and the tag says "this is a
coherent thing to tell players about". A feature built across several pull requests goes out one at a
time, so each pull request must be shippable on its own — working and not misleading, if incomplete —
and the release that follows the last one lists them all.

Releases are cut by label, because a release that depends on remembering to run a command gets
forgotten. An issue is given `release: patch`, `release: minor`, `release: major` or `release: none`
when it is triaged as ready, which is when its meaning for players is being decided. A pull request
takes the label of the issues it closes when it is opened or its description is edited, unless it
already has one; only a closing keyword links an issue, so in a feature split across pull requests the
earlier ones say "Part of #N" and only the last carries the label. On merge, a patch, minor or major
label cuts the next version from the newest `v*` tag, the biggest bump winning if there are several.
The release is made before the merge is built, so that one build and deploy already shows the new
version. A pull request is the one place to change the decision; `release: none` stops a label being
copied back. `gh release create` by hand still works for anything the labels missed.

Deploying only on tags was the alternative. The live site would always be an exact release, but every
change would need a second, manual step to reach players, for an app with no accounts and nothing to
break for them except saved Army Lists, which migrations already protect. A build-time flag to hide
unfinished work stays available if one pull request ever can't be shippable alone.

Pushing a `v*` tag by hand also runs the deploy workflow, which rebuilds the commit already live so its footer
shows the clean version rather than the `+N` it was deployed with. The checkout fetches full history so
`git describe` can see the tags.

That rebuild is why Pages publishes a `gh-pages` branch rather than an uploaded artifact. Pages ties an
artifact deployment to its source commit and keeps the first one, so the tag's rebuild of a commit its
merge already deployed was silently dropped; overriding the build version was ignored, and the
deployment API rejects anything but a commit SHA. The deploy job instead force-pushes the build as a
single fresh commit to `gh-pages`, which Pages publishes like any other push. The branch holds only the
latest build and is never edited by hand. Deploying only on tags would also have avoided the collision,
at the cost of merges no longer going live.

## Numbering

Versions start at `v0.1.0`. Before 1.0, a minor version is a new feature or anything a player has to act
on, and a patch is fixes only. From `1.0.0`, a major version is a change a player has to act on, such as
saved Army Lists or printed cards changing in a way they'd notice; `release: major` on a `v0` version
gives `v1.0.0`. What has to land before 1.0 is the
`1.0.0` milestone in GitHub Issues, not this record, because scope is planning and changes.

## Consequences

- The footer answers both "which build is this?" and "what changed?", and the SHA stays copyable.
- Release notes are the changelog; nothing extra ships in `dist/`.
- A labelled merge releases and deploys in one run; a release by hand costs one extra run, rebuilding a
  commit that is already live.
