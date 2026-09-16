# The title row is sticky and holds one Army Lists menu

Supersedes ADR 0005's scrolling identity strip. The shell is now a sticky `header` of two rows, then the
`main` editor and the footer. The first row holds the `h1` and a ☰ icon button, `aria-label="Army Lists"`,
that opens the Army Lists menu. The second holds the Army List name, the Bp total against the Bp Limit, the
over-limit warning, print size and **Download PDF**. Nothing scrolls away.

The menu replaces the Saved Army Lists `select` and the row of list buttons beside it (#47, #62, #65).
In order: a "Saved Army Lists" group with each list as a button (the Open Army List marked with
`aria-current` and a ✓, each showing when it last changed), then New Army List and Import Army List…, then
Duplicate Army List and Export Army List, then Delete Army List…, then Where are Army Lists kept? (#50),
which opens a dialog rather than acting on a list, with separators between the groups.
Choosing the Open Army List only closes the menu. An Open Army List that storage couldn't keep is still
shown in the group, current and with no time.

## Why

By #65 the bar had grown to **337px of the 390×620 viewport** ADR 0005 measured: 54% of a phone screen,
against the 199px it accepted. A "⋯" menu beside the picker, holding only the list actions, brought that to
**259px**, still too much, because the picker and the name field each took a row. Folding the picker into
the menu and putting the menu's button beside the `h1` leaves a row that was there anyway:

| Width | Sticky header | With the over-limit warning |
|---|---|---|
| 320 | 222px (the title wraps) | 249px |
| 360–383 | 204px | 231px |
| 384–703 (390×620) | **167px (27%)** | 194px |
| 704+ | 123px | 150px |

Measured on the built app, like 0005, in Chromium; the prototype measured 2px less below 384px.
That is smaller than 0005's own bar while also keeping the title, so the strip no longer buys anything by
scrolling away. The name gets its own row below 44rem: sharing one with Bp was unusable between 362px and
about 460px. Below 24rem print size and Download PDF take a row of their own. "Army List name" and
"Bp Limit" lose their visible labels but keep them as accessible names; the name field shows
"Army List name" as a placeholder. Print size keeps its label, since the select's value alone doesn't say
what it sets.

The menu is a disclosure button (`aria-expanded`) opening a native `popover="auto"` of plain buttons, not an
ARIA `menu`. The browser gives light dismiss, Esc and the top layer, so the sticky header can't clip it, and
a dozen buttons don't need arrow keys; a half-built `menu` role would promise a keyboard model it lacks.
`popover="auto"` doesn't close when Tab leaves it, so that is added. Until CSS anchor positioning reaches
Firefox, a few lines of script place the popover under its button.

Considered and rejected, all prototyped on `prototype/army-list-menu`: the "⋯" menu beside the picker as a
disclosure (B) and as a full ARIA `menu` (C), both at 259px. A bar that condenses on scroll, left open by
0005, isn't needed at 167px.

## Consequences

- Every Army-List-level control, and now the title, stays reachable at any scroll position, at any width.
- Switching lists remounts the editor, which drops focus to `body`. After New, Duplicate, a completed
  Import, a confirmed Delete or choosing another list, focus goes to the new ☰ button. Closing the popover
  (Export, a cancelled confirm or file picker) returns focus to the button without extra code.
- Headless tests stub `window.confirm` and the file picker's `cancel`; focus after the real dialogs is
  checked by hand in Chrome and Firefox.
- New chrome still goes in the shell, not in `main`.
