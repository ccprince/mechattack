import { armyListSchema, type ArmyList } from './armyList';
import { migrateArmyList } from './migrations';

/**
 * The Army List's versioned document, as autosave keeps it and as an exported file holds it: one
 * format, so a file and a save migrate and validate the same way.
 */
export function serializeArmyList(list: ArmyList): string {
  return JSON.stringify(list);
}

/** Reads a saved or exported document, migrated and checked; undefined if it can't be read. */
export function parseArmyList(text: string): ArmyList | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  const result = armyListSchema.safeParse(migrateArmyList(json));
  return result.success ? result.data : undefined;
}

/** A download filename from the Army List's name: lower-case words joined by hyphens. */
export function armyListFilename(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'army-list'}.json`;
}
