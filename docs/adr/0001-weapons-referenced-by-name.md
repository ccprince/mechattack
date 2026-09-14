# Weapons are built into the app and referenced by name

Weapon stats in Mech Attack are predetermined, so the Weapon Catalog ships inside the app. Saved and
exported Army Lists store only each Weapon's unique name, not a copy of its stats. That way, a catalog
fix (errata) reaches every existing list without editing the lists. The cost is that list files aren't
self-contained: they only mean something to an app whose catalog has those names.

## Consequences

- A catalog Weapon's name never changes once released. A rename adds the old name as an alias.
- Importing a list that names an unknown Weapon still loads it. The mount shows "unknown weapon: X"
  and stays empty until fixed, and printing warns first.
