# Weapons are built into the app and referenced by name

Weapon and Support Equipment stats in Mech Attack are predetermined, so the Catalog ships inside the
app. Saved and exported Army Lists store only each Weapon's or Support Equipment's unique name, not a
copy of its stats. That way, a Catalog fix (errata) reaches every existing list without editing the
lists. The cost is that list files aren't self-contained: they only mean something to an app whose
Catalog has those names.

## Consequences

- A Catalog entry's name never changes once released. A rename adds the old name as an alias.
- Names are unique across Weapons and Support Equipment, so one lookup by name covers both.
- Importing a list that names something missing from the Catalog still loads it. The mount shows
  "unknown weapon: X" and stays empty until fixed, and printing warns first.
