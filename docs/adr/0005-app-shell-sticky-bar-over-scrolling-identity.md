# The app shell is a sticky control bar under a scrolling identity strip

The app renders four things in order: an identity strip holding the `h1`, a sticky app bar holding
`ArmyListHeader`, the `main` editor, and a footer. Only the bar is sticky, and it is the `banner`
landmark, because it is the part that does work: the Army List name, the Bp total against the Bp Limit,
the over-limit warning, print size and **Download PDF**. Before this they sat in the scrolling page and
went out of reach on a long Army List.

The alternative of one sticky bar carrying the title as well was measured at **265px of a 390×620
viewport** — over 40% of a phone screen, permanently, most of it spent on an `h1` that never changes.
Letting the identity scroll away brings that to **199px** and costs nothing but an extra element.

A bar that condenses on scroll was measured at **105px** and is the better answer on height alone. It
was not taken, for now: it needs a scroll listener, a second visual state to keep consistent, controls
that move under the player's finger mid-scroll, and an `aria-label` on the Print size select to replace
the visible label it hides. Its target is exactly this bar's control row, so it stays available as an
additive change if the bar proves too tall in play, rather than a different shell.

`ArmyListHeader` renders a `div`, not a `header`: the landmark belongs to the bar that contains it, and
two nested `banner` landmarks would be worse than one. The bar is sticky inside the full-height shell
rather than inside a wrapper it shares with the strip, because a sticky element only travels within its
own containing block — wrapping the two together would let the bar scroll away with the strip.

The footer names the build, links the repo, and says Army Lists are saved in this browser only, which
is the only place a player is told where their data lives. The build is the short commit SHA, passed in
as `VITE_COMMIT_SHA` by the `build` script and read through `import.meta.env`; that keeps Node APIs and
`@types/node` out of a browser-only project's type-checking. The label now comes from release tags (ADR 0006); a fuller
explanation of browser storage, which the one-line footer can't carry, is #50.

## Consequences

- Every Army-List-level control stays reachable at any scroll position, at any width.
- The strip is where the build version and, later, the Army List menu (#46, #47) belong; the menu has
  a home before it has contents.
- New chrome goes in the shell, not in the page: `main` holds the editor and nothing else.
- Tests were untouched. Every role and accessible name is the same, and `ArmyListHeader`'s change from
  `header` to `div` removes no role, because inside `main` it never had one.
