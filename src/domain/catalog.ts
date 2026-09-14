import catalogCsv from './catalog.csv?raw';

export const catalogClasses = ['Light', 'Medium', 'Heavy'] as const;
export type CatalogClass = (typeof catalogClasses)[number];

export interface Rv {
  /** Only some Weapons (missiles) have a minimum range. */
  min?: number;
  normal: number;
  extended: number;
}

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

// Dp waits for its design session.
export interface Weapon extends CatalogEntryBase {
  kind: 'Weapon';
  rv: Rv;
}

export interface SupportEquipment extends CatalogEntryBase {
  kind: 'Support Equipment';
}

export type CatalogEntry = Weapon | SupportEquipment;

const header = 'name,kind,class,bp,rv_min,rv_normal,rv_extended,hv,short_name';

/** Parses the Catalog CSV. Cells are trimmed, and a blank cell means the value is absent. */
function parseCatalog(csv: string): CatalogEntry[] {
  const [head, ...rows] = csv.trim().split(/\r?\n/);
  if (head?.replace(/\s/g, '') !== header) throw new Error(`Catalog CSV header must be ${header}`);

  return rows.map((row, index) => {
    const cells = row.split(',').map((cell) => cell.trim());
    const [name = '', kind, entryClass = '', bp, rvMin, rvNormal, rvExtended, hv, shortName = ''] =
      cells;
    const fail = (problem: string) => {
      throw new Error(`Catalog CSV line ${index + 2} (${name}): ${problem}`);
    };
    const optionalNumber = (cell: string | undefined) => {
      if (!cell) return undefined;
      const value = Number(cell);
      return Number.isFinite(value) ? value : fail(`"${cell}" is not a number`);
    };

    if (cells.length !== 9) fail(`expected 9 cells, got ${cells.length}`);
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

    if (kind === 'Support Equipment') return { ...entry, kind };
    if (kind !== 'Weapon') return fail(`unknown kind "${kind}"`);
    return entry.rv ? { ...entry, kind, rv: entry.rv } : fail('a Weapon needs Rv');
  });
}

export const catalog: readonly CatalogEntry[] = parseCatalog(catalogCsv);

export function findCatalogEntry(name: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.name === name);
}

/** Rv as written on cards: `10/14`, or `3-10/14` with a minimum range. */
export function formatRv({ min, normal, extended }: Rv): string {
  return `${min === undefined ? '' : `${min}-`}${normal}/${extended}`;
}
