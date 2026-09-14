# Mech Attack list builder

Builds army lists for the Mech Attack tabletop game and prints record cards for play.

## Language

### Lists and units

**Army List**:
A named set of units a player fields for one game, built against a Bp Limit.
_Avoid_: Force, roster

**Bp Limit**:
The total Bp the players agree an Army List may spend for a game.
_Avoid_: Points limit, game size

**Unit Profile**:
The design of one unit: its name, kind, Class, stats and mounted Weapons. Belongs to one Army List,
where its name is unique, and the list fields it in some quantity; each copy is a separate card.
A quantity of 0 keeps a Unit Profile on the list without fielding it, such as a variant not in use
this game. Only fielded copies count against the Bp Limit or print.
_Avoid_: Unit template, datasheet

**Legal**:
A Unit Profile is Legal when it breaks no build rule, such as mounting something heavier than its
Class, naming something missing from the Catalog, or costing less Bp than what it mounts. Each broken
rule is an **Issue**. A printed card is taken as Legal at the table, so an illegal card is printed
marked as such. Exceeding the Bp Limit is a problem with the Army List, not an Issue.
_Avoid_: Valid, invalid (for build rules)

**Mech**, **Vehicle**, **Troop**:
The only three kinds of unit. Each prints on its own card layout.
_Avoid_: Troops (as a kind name), infantry

**Class**:
A unit's, Weapon's or Support Equipment's weight category, which limits what a unit may mount. A
Mech may mount only Weapons and Support Equipment of its own Class or lighter. Mech: Light, Medium, Heavy. Vehicle: Ultra-light, Light,
Medium. Troop: Light, Heavy, Jump. (The Vehicle and Troop cards still label it "Type".)
_Avoid_: Type

### Unit stats

Stat abbreviations are written with an initial capital (Bp, not BP).

**Bp** (Build Points):
What a unit, Weapon or Support Equipment costs. A unit's Bp is its total cost, including what it
mounts. It counts against the Bp Limit and is 1 to 20.

**Mv** (Move Value):
How far a unit moves. Like Tp and Hc, it follows from the unit's Class and upgrades rather than
being chosen directly.

**Tp** (Target Profile):
How hard a unit is to hit.

**Hc** (Heat Control):
A Mech's capacity to manage heat. Only Mechs track heat. Not the same as Hv.

**Sv** (Strength Value):
A Troop unit's starting strength, at most 20. Strength boxes above it are blanked on the card.

**Armor**:
A Mech or Vehicle's starting armor, always a multiple of 10. A Mech's is 0 to 150. Armor rows
above it are blanked on the card.

### Weapons

**Weapon**:
An entry in the Catalog, identified by its unique name, with a Class and fixed stats (Bp,
Rv, Hv, Dp). Any kind of unit may mount it, subject to Class. A unit may mount the same Weapon more than once.
_Avoid_: Equipment (that's Support Equipment)

**Support Equipment**:
A fitting that isn't a Weapon: it has Bp, may have Rv and Hv, and never has Dp. On a Mech it takes
a torso Hardpoint.

**Catalog**:
The predetermined set of Weapons and Support Equipment, built into the app. Names are unique across
both, and every entry has a Class of Light, Medium or Heavy, whatever kind of unit mounts it.
_Avoid_: Weapon Catalog

**Hardpoint**:
One of a Mech's four mounts: Left Arm, Right Arm, Left Torso, Right Torso. Each has its own firing
arc and holds one Weapon, one Support Equipment (torso only) or nothing.

**Hull Option**:
An optional fitting on a Vehicle, such as a Turret, a Static Weapon Mount or a Cargo Bay.

**Crew Served Weapon**:
The single optional weapon a Troop unit carries.

**Dp** (Damage Profile):
The pattern of boxes a weapon's hit fills, some marked with a multiplier. Fits a 5×5 area for
Mech weapons, 4×4 for Vehicle and 3×3 for Troop.
_Avoid_: Damage shape, template

**Rv** (Range Value):
A weapon's range, given as a normal and an extended value, plus a minimum range for some (missiles),
written `3-10/14`.

**Hv** (Heat Value):
The heat a Weapon or Support Equipment generates when a Mech uses it. Only Mechs track heat.
