# Saved Army Lists are kept behind an index, one document per list

Before this, the browser kept one Army List, in `mechattack.armyList`. To keep several, each Saved Army
List is stored in its own key, `mechattack.armyList.<id>`, as the same versioned document an export
writes. An index, `mechattack.armyLists`, holds a schema version, the id of the Open Army List, and an
`{ id, changed }` entry for each Saved Army List. The id is a `crypto.randomUUID()` and appears only in
keys and the index, never in the document, so exported files don't change.

Names stay only in the documents. The picker reads each one to show it, which costs little, and a rename
writes one key. `changed` goes in the index rather than the document because it describes this browser's
copy, not the Army List: an imported file gets the time of its import, which is what tells two lists
with the same name apart. It is set by New, Duplicate and Import and by any edit to the list, but not by
opening a list or selecting a Unit Profile. The picker orders lists by it, so the index stores no order.

On load, a readable `mechattack.armyList` moves to a new id with `changed` set to now, and is recorded
in the index as open. The old key is then removed. An unreadable one goes to the backup slot, as before.
This runs on every load, not just the first: a tab still open on the previous version keeps saving to
the single slot, and its edits arrive as one more Saved Army List rather than being lost.

## Considered options

- **One document holding every list.** No index to keep consistent, but every autosave rewrites every
  list, and a large collection runs toward the ~5MB `localStorage` quota on each keystroke.
- **Enumerating keys instead of an index.** `KeyValueStore` was deliberately the three methods the app
  uses. An index keeps normal operation on those three.

`KeyValueStore` does gain a fourth method, `keys()`, but only for recovery. Without it a missing or
unreadable index would leave every list document in storage with nothing able to find it: the worst
outcome this feature could have. When the index can't be read, it is rebuilt from the
`mechattack.armyList.<id>` keys, every `changed` set to now, and the most recent list opens.

## Consequences

- A list document is checked only when opened. An unreadable one moves to the single backup slot, leaves
  the index, and the most recently changed remaining list opens, or a new one if none is left. The
  recovery banner offers it as before; it can't name it, since the name is in the text that couldn't be read.
- There is always an Open Army List: deleting the last Saved Army List opens a new, empty one.
- Each autosave writes two keys, its list and the index. It re-reads the index and merges in only its
  own entry, and writes nothing if its id has left the index, so a list deleted in another tab isn't
  brought back and one tab's stale index doesn't overwrite another's. A failed index write only leaves
  a stale `changed`.
- Tabs don't sync live: a tab shows what it loaded until reload. A `storage` event listener is where
  that would go if it's ever wanted.
