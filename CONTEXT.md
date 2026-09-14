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
_Avoid_: Unit template, datasheet

**Mech**, **Vehicle**, **Troop**:
The only three kinds of unit. Each prints on its own card layout.
_Avoid_: Troops (as a kind name), infantry

**Class**:
A unit's or Weapon's category within its kind, which limits the Weapons a unit may mount. Mech: Light, Medium, Heavy. Vehicle: Ultra-light, Light,
Medium. Troop: Light, Heavy, Jump. (The Vehicle and Troop cards still label it "Type".)
_Avoid_: Type

### Unit stats

Stat abbreviations are written with an initial capital (Bp, not BP).

**Bp** (Build Points):
What a unit costs against the Bp Limit.

**Mv** (Move Value):
How far a unit moves.

**Tp** (Target Profile):
How hard a unit is to hit.

**Hc** (Heat Control):
A Mech's capacity to manage heat. Only Mechs track heat. Not the same as Hv.

**Sv** (Strength Value):
A Troop unit's starting strength, at most 20. Strength boxes above it are blanked on the card.

**Armor**:
A Mech or Vehicle's starting armor, always a multiple of 10. Armor rows above it are blanked on the card.

### Weapons

**Weapon**:
An entry in the Weapon Catalog, identified by its unique name, with fixed stats (short name, Rv, Hv,
Dp).
_Avoid_: Equipment (unless it proves to be a distinct concept)

**Weapon Catalog**:
The predetermined set of Weapons, built into the app.

**Hardpoint**:
One of a Mech's four weapon mounts: Left Arm, Right Arm, Left Torso, Right Torso. Each has its own
firing arc. May be empty.

**Hull Option**:
An optional fitting on a Vehicle, such as a Turret, a Static Weapon Mount or a Cargo Bay.

**Crew Served Weapon**:
The single optional weapon a Troop unit carries.

**Dp** (Damage Profile):
The pattern of boxes a weapon's hit fills, some marked with a multiplier. Fits a 5×5 area for
Mech weapons, 4×4 for Vehicle and 3×3 for Troop.
_Avoid_: Damage shape, template

**Rv** (Range Value):
A weapon's range, given as a normal and an extended value.

**Hv** (Heat Value):
The heat a Weapon generates when a Mech fires it. Only Mech Weapons have Hv.
