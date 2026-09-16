# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Release labels

An issue triaged as `ready-for-agent` or `ready-for-human` also carries exactly one release label,
which its closing pull request copies and which cuts a release on merge (ADR 0006):

| Label            | Use for                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `release: patch` | Fixes only                                                           |
| `release: minor` | A new feature, or anything a player has to act on (before 1.0)       |
| `release: major` | From 1.0, a change a player has to act on; on a `v0` version, 1.0.0 |
| `release: none`  | Decided: no release, such as docs, tests or tooling                  |
