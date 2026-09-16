#!/usr/bin/env bash
# Release labels (ADR 0006): `release: patch|minor|major` on a merged pull request cuts that release;
# `release: none` means decided, no release. Needs GH_TOKEN and GITHUB_REPOSITORY.
#
#   release-label.sh copy <pr>        give a pull request the release label of the issues it closes
#   release-label.sh release <sha>    release the merge commit <sha> if its pull request is labelled
#   release-label.sh next <tag> <label>   print the version after <tag>
set -euo pipefail

# Reads label names, one per line, and prints the one with the biggest bump, or nothing.
strongest() {
  local best='' rank=-1 label r
  while IFS= read -r label; do
    case $label in
      'release: none') r=0 ;;
      'release: patch') r=1 ;;
      'release: minor') r=2 ;;
      'release: major') r=3 ;;
      *) continue ;;
    esac
    if ((r > rank)); then best=$label rank=$r; fi
  done
  printf '%s' "$best"
}

next() {
  local major minor patch
  IFS=. read -r major minor patch <<<"${1#v}"
  case $2 in
    'release: major') echo "v$((major + 1)).0.0" ;;
    'release: minor') echo "v$major.$((minor + 1)).0" ;;
    'release: patch') echo "v$major.$minor.$((patch + 1))" ;;
    *) echo "no bump for '$2'" >&2 && return 1 ;;
  esac
}

copy() {
  local pr=$1 current found
  current=$(gh pr view "$pr" -R "$GITHUB_REPOSITORY" --json labels --jq '.labels[].name' | strongest)
  if [[ -n $current ]]; then
    echo "#$pr already has '$current'"
    return
  fi
  found=$(gh api graphql -F owner="${GITHUB_REPOSITORY%/*}" -F name="${GITHUB_REPOSITORY#*/}" -F number="$pr" \
    -f query='query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) { pullRequest(number: $number) {
        closingIssuesReferences(first: 20) { nodes { labels(first: 50) { nodes { name } } } } } } }' \
    --jq '.data.repository.pullRequest.closingIssuesReferences.nodes[].labels.nodes[].name' | strongest)
  if [[ -z $found ]]; then
    echo "#$pr closes no issue with a release label"
    return
  fi
  gh pr edit "$pr" -R "$GITHUB_REPOSITORY" --add-label "$found" >/dev/null
  echo "#$pr labelled '$found' from the issues it closes"
}

release() {
  local sha=$1 pr label latest version
  pr=$(gh api "repos/$GITHUB_REPOSITORY/commits/$sha/pulls" --jq '[.[] | select(.merged_at)][0].number // empty')
  if [[ -z $pr ]]; then
    echo "$sha is not a pull request merge; no release"
    return
  fi
  label=$(gh pr view "$pr" -R "$GITHUB_REPOSITORY" --json labels --jq '.labels[].name' | strongest)
  if [[ -z $label || $label == 'release: none' ]]; then
    echo "#$pr has no release label to act on; no release"
    return
  fi
  latest=$(git tag --list 'v*.*.*' --sort=-v:refname | head -n 1)
  version=$(next "${latest:-v0.0.0}" "$label")
  gh release create "$version" -R "$GITHUB_REPOSITORY" --target "$sha" --generate-notes
  echo "Released $version from #$pr ('$label')"
}

"$@"
