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
Class, naming something missing from the Catalog, or costing more Bp than its Frame or Troop Class allows or no Bp at all. Each broken
rule is an **Issue**. A printed card is taken as Legal at the table, so an illegal card is printed
marked as such. Exceeding the Bp Limit is a problem with the Army List, not an Issue.
_Avoid_: Valid, invalid (for build rules)

**Mech**, **Vehicle**, **Troop**:
The only three kinds of unit. Each prints on its own card layout. The Unit Profile list groups by
kind under plural headings — Mechs, Vehicles, Troops — where the plural names a group of units
rather than the kind.
_Avoid_: Troops (as a kind name), infantry

**Class**:
A unit's, Weapon's or Support Equipment's weight category, which limits what a unit may mount. A
Mech may mount only Weapons and Support Equipment of its own Class or lighter. A Vehicle may mount
Light ones, and a Medium Vehicle Medium ones too. Mech: Light, Medium, Heavy. Vehicle: Ultra-light, Light,
Medium. Troop: Light Infantry, Heavy Infantry, Jump Infantry. A Troop may mount only Light ones, whatever
its Class. (The Vehicle and Troop cards still label it "Type".)
_Avoid_: Type

### Unit stats

Stat abbreviations are written with an initial capital (Bp, not BP).

**Bp** (Build Points):
What a unit, Weapon or Support Equipment costs. A unit's Bp is its total cost, including what it
mounts, and counts against the Bp Limit. A Mech's or Vehicle's Bp is worked out, never chosen: 1 per
10 Armor, 2 per Heat Sink, 2 per Engine Upgrade, 1 per Cargo Bay, plus the Bp of its mounts. Its
Frame, Turret and Static Mount cost nothing. A Troop's Bp is also worked out: its Class's Base Bp plus
its Crew Served Weapon's Bp.

**Frame**:
The base a Mech or Vehicle Class gives: starting Mv and Tp, and the most Bp a unit of that Class may
cost. A Mech Frame also gives Hc; a Vehicle Frame gives Hull Options instead.
Mech Light: 8 Bp, Mv 5, Tp 5, Hc 4. Medium: 14 Bp, Mv 4, Tp 4, Hc 4. Heavy: 20 Bp, Mv 3, Tp 3, Hc 4.
Vehicle Ultra-light: 4 Bp, Mv 5, Tp 5, 1 Hull Option. Light: 5 Bp, Mv 4, Tp 4, 2 Hull Options.
Medium: 6 Bp, Mv 3, Tp 4, 2 Hull Options.
A unit costing more than its Frame allows has an Issue. Comes with the Class; never chosen on its own.
Troops have no Frame; see Troop Class.
_Avoid_: Chassis

**Troop Class**:
A Troop's Class, which alone sets its Base Bp, max Bp, Mv, Tp and Sv; nothing a Troop takes changes
them. Unlike a Frame, it costs Bp: its **Base Bp**.
Light Infantry: Base Bp 2, max Bp 4, Mv 3, Tp 4, Sv 5. Heavy Infantry: Base Bp 3, max Bp 5, Mv 3,
Tp 4, Sv 10. Jump Infantry: Base Bp 5, max Bp 6, Mv 4, Tp 4, Sv 10.
A Troop costing more than its max Bp has an Issue.
_Avoid_: Troop Frame, Troop type

**Heat Sink**:
A Mech upgrade costing 2 Bp that adds 1 Hc. A Mech may take any number, within its Frame's Bp.
Vehicles have none.

**Engine Upgrade**:
A Mech or Vehicle upgrade costing 2 Bp; a unit takes at most two. The first adds 1 Mv, the second 1 Tp.

**Mv** (Move Value):
How far a unit moves. Like Tp and Hc, it follows from the unit's Class and upgrades rather than
being chosen directly.

**Tp** (Target Profile):
How hard a unit is to hit; higher is harder.

**Hc** (Heat Control):
A Mech's capacity to manage heat. Only Mechs track heat. Not the same as Hv.

**Sv** (Strength Value):
A Troop's starting strength, set by its Class and never changed: 5 for Light Infantry, 10 for Heavy
and Jump Infantry. Troops have Sv instead of Armor. Strength boxes above it are blanked on the card.

**Armor**:
A Mech or Vehicle's starting armor, always a multiple of 10, costing 1 Bp per 10. A Mech's is 0 to
150, a Vehicle's 0 to 60. Armor rows above it are blanked on the card.

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
An optional fitting on a Vehicle: a Turret, a Static Mount or a Cargo Bay. A Vehicle's Frame sets how
many Hull Options it may take; a Static Mount counts as two. Taking more is an Issue.

**Turret**:
A Hull Option holding one Weapon or Support Equipment, or nothing, firing in any direction. A Vehicle
takes at most one.

**Static Mount**:
A Hull Option with two slots, each holding one Weapon or Support Equipment, or nothing, firing only
into the front arc. Counts as
two Hull Options, so an Ultra-light Vehicle can't take one.
_Avoid_: Static Weapon Mount

**Cargo Bay**:
A Hull Option costing 1 Bp. A Vehicle takes at most two. What it carries isn't tracked.

**Crew Served Weapon**:
A Troop's single mount, holding one Light Weapon or Light Support Equipment, or nothing. The rules
call it a weapon even when it holds Support Equipment.

**Standard Equipment**:
What a Troop has because of its Class, costing nothing and outside the Catalog: Individual Weapons
on every Troop, plus Jump Packs on Jump Infantry. Never chosen.

**Dp** (Damage Profile):
The shape of boxes a Weapon's hit fills on a Mech or Vehicle target's Armor Grid. Its **Impact Box**, centered in
the top row, lands on the rolled Hit Location's outermost unmarked layer; boxes below it go deeper,
boxes beside it spread into neighboring Hit Locations. Every Weapon has one Dp, whatever mounts it.
A shape is symmetric about its center column, and each row's boxes are contiguous. A Light Weapon's
Dp fits 3×3, a Medium one's 4×4 and a Heavy one's 5×5, which is why only a Mech card has room for 5×5.
A Troop target ignores the shape: how much a hit costs its Sv follows from the Weapon, not its Dp.
_Avoid_: Damage shape, template

**Impact Box**:
The one box of a Dp that lands on the rolled Hit Location, centered in its top row.
_Avoid_: Black box, center box

**Rolls**:
How many Hit Locations one hit of a Weapon rolls, drawing its Dp at each; 1 unless shown, as in 5×.
Five matching rolls stack five Dp deep in one column; five different rolls put one in each of five.
_Avoid_: Multiplier

**Armor Grid**:
The grid on a Mech or Vehicle card where damage is marked: a column per Hit Location, 1 to 10, and a
row per 10 Armor, outermost at the top. Rows above the unit's Armor are blanked.

**Hit Location**:
One of the ten numbered columns of the Armor Grid, rolled to place a Dp's Impact Box.

**Rv** (Range Value):
A weapon's range, given as a normal and an extended value, plus a minimum range for some (missiles),
written `3-10/14`.

**Hv** (Heat Value):
The heat a Weapon or Support Equipment generates when a Mech uses it. Only Mechs track heat.
