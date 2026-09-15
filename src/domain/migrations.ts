/**
 * Brings a saved Army List document up to the current version, one step at a time, before it's
 * checked against `armyListSchema`. Anything it doesn't recognize passes through for the schema to
 * reject.
 */
export function migrateArmyList(document: unknown): unknown {
  let current = document;
  if (isRecord(current) && current.version === 1) current = fromVersion1(current);
  return current;
}

const typedStats = ['bp', 'mv', 'tp', 'hc'];

/**
 * Version 2 works out Bp, Mv, Tp and Hc from the Frame and upgrades. The typed-in values were never
 * checked against a rule, so they're dropped rather than turned into upgrades.
 */
function fromVersion1(list: Record<string, unknown>): Record<string, unknown> {
  const { unitProfiles } = list;
  return {
    ...list,
    version: 2,
    unitProfiles: Array.isArray(unitProfiles)
      ? unitProfiles.map((profile: unknown) => {
          if (!isRecord(profile)) return profile;
          const kept = Object.entries(profile).filter(([key]) => !typedStats.includes(key));
          return { ...Object.fromEntries(kept), heatSinks: 0, engineUpgrades: 0 };
        })
      : unitProfiles,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
