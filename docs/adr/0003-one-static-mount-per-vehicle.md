# A Vehicle stores at most one Static Mount

The rules don't limit Static Mounts directly: the limit comes from a Vehicle's Hull Options, and a
Static Mount counts as two. But no Vehicle Frame has more than two Hull Options, so a Legal Vehicle
can never take two. A Vehicle Unit Profile therefore stores whether it has a Static Mount (and a
Turret), not a list of them, which keeps the editor and card simple. If a Frame with four or more
Hull Options is ever added, this becomes a list, with a migration.
