import catalogCsv from './catalog.csv?raw';

export const catalogClasses = ['Light', 'Medium', 'Heavy'] as const;
export type CatalogClass = (typeof catalogClasses)[number];

export interface Rv {
  /** Only some Weapons (missiles) have a minimum range. */
  min?: number;
  normal: number;
  extended: number;
}

/** A Weapon's Damage Profile: the shape of boxes one hit fills, and how many Hit Locations it rolls. */
export interface Dp {
  /** Hit Locations one hit rolls, drawing the shape at each; 1 unless the Weapon shows Rolls. */
  rolls: number;
  /** Boxes per row, top to bottom. Every count is odd, since a shape is symmetric about its center. */
  rows: readonly number[];
}

/** The largest Dp a Class may have: 3×3 Light, 4×4 Medium, 5×5 Heavy (CONTEXT.md). */
export const dpGridSize: Record<CatalogClass, number> = { Light: 3, Medium: 4, Heavy: 5 };

interface CatalogEntryBase {
  /** Unique across the Catalog and permanent; Army Lists reference entries by this name (ADR 0001). */
  name: string;
  shortName: string;
  class: CatalogClass;
  bp: number;
  rv?: Rv;
  /** Absent when the entry generates no heat. */
  hv?: number;
}

export interface Weapon extends CatalogEntryBase {
  kind: 'Weapon';
  rv: Rv;
  dp: Dp;
}

export interface SupportEquipment extends CatalogEntryBase {
  kind: 'Support Equipment';
}

export type CatalogEntry = Weapon | SupportEquipment;

const header = 'name,kind,class,bp,rv_min,rv_normal,rv_extended,hv,dp,short_name';

/**
 * Parses a `dp` cell (docs/cards.md): an optional `N x` roll count, then one digit per row, top to
 * bottom, giving how many boxes that row holds. Throws when the notation is malformed, a row is even
 * or the shape is larger than `gridSize` square.
 */
export function parseDp(cell: string, gridSize: number): Dp {
  const match = /^(?:([1-9]\d*)x)?([1-9]+)$/.exec(cell.replace(/\s/g, ''));
  if (!match) throw new Error(`"${cell}" is not a Dp`);
  const rolls = match[1] === undefined ? 1 : Number(match[1]);
  const rows = [...match[2]!].map(Number);

  const evenRow = rows.find((boxes) => boxes % 2 === 0);
  // A shape is symmetric about its center column, so no row can hold an even number of boxes.
  if (evenRow !== undefined) throw new Error(`a row of ${evenRow} boxes is not symmetric`);
  const widest = Math.max(...rows);
  if (rows.length > gridSize || widest > gridSize) {
    throw new Error(`${widest}×${rows.length} Dp is larger than ${gridSize}×${gridSize}`);
  }
  return { rolls, rows };
}

/** Parses the Catalog CSV. Cells are trimmed, and a blank cell means the value is absent. */
function parseCatalog(csv: string): CatalogEntry[] {
  const [head, ...rows] = csv.trim().split(/\r?\n/);
  if (head?.replace(/\s/g, '') !== header) throw new Error(`Catalog CSV header must be ${header}`);

  return rows.map((row, index) => {
    const cells = row.split(',').map((cell) => cell.trim());
    const [
      name = '',
      kind,
      entryClass = '',
      bp,
      rvMin,
      rvNormal,
      rvExtended,
      hv,
      dp = '',
      shortName = '',
    ] = cells;
    const fail = (problem: string) => {
      throw new Error(`Catalog CSV line ${index + 2} (${name}): ${problem}`);
    };
    const optionalNumber = (cell: string | undefined) => {
      if (!cell) return undefined;
      const value = Number(cell);
      return Number.isFinite(value) ? value : fail(`"${cell}" is not a number`);
    };

    if (cells.length !== 10) fail(`expected 10 cells, got ${cells.length}`);
    const catalogClass = catalogClasses.find((known) => known === entryClass);
    if (!catalogClass) return fail(`unknown Class "${entryClass}"`);
    const normal = optionalNumber(rvNormal);
    const extended = optionalNumber(rvExtended);
    const min = optionalNumber(rvMin);
    if ((normal === undefined) !== (extended === undefined)) fail('Rv needs normal and extended');
    if (min !== undefined && normal === undefined) fail('minimum Rv without normal Rv');

    const entry: CatalogEntryBase = {
      name,
      shortName,
      class: catalogClass,
      bp: optionalNumber(bp) ?? fail('missing Bp'),
    };
    if (normal !== undefined && extended !== undefined) {
      entry.rv = min === undefined ? { normal, extended } : { min, normal, extended };
    }
    const hvValue = optionalNumber(hv);
    if (hvValue !== undefined) entry.hv = hvValue;

    if (kind === 'Support Equipment') {
      if (dp) fail('Support Equipment has no Dp');
      return { ...entry, kind };
    }
    if (kind !== 'Weapon') return fail(`unknown kind "${kind}"`);
    if (!entry.rv) return fail('a Weapon needs Rv');
    if (!dp) return fail('a Weapon needs a Dp');
    let parsedDp: Dp;
    try {
      parsedDp = parseDp(dp, dpGridSize[catalogClass]);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
    return { ...entry, kind, rv: entry.rv, dp: parsedDp };
  });
}

export const catalog: readonly CatalogEntry[] = parseCatalog(catalogCsv);

export function findCatalogEntry(name: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.name === name);
}

/**
 * The Dp of a mounted entry, or undefined when there's nothing to draw: an empty mount, Support
 * Equipment, or a name missing from the Catalog.
 */
export function weaponDp(entry: CatalogEntry | undefined): Dp | undefined {
  return entry?.kind === 'Weapon' ? entry.dp : undefined;
}

/** Rv as written on cards: `10/14`, or `3-10/14` with a minimum range. */
export function formatRv({ min, normal, extended }: Rv): string {
  return `${min === undefined ? '' : `${min}-`}${normal}/${extended}`;
}
