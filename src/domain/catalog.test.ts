import { describe, expect, it } from 'vitest';
import { catalog, findCatalogEntry, formatRv } from './catalog';

describe('catalog', () => {
  it('holds the 21 Weapons and 4 Support Equipment from the CSV', () => {
    expect(catalog.filter((entry) => entry.kind === 'Weapon')).toHaveLength(21);
    expect(catalog.filter((entry) => entry.kind === 'Support Equipment')).toHaveLength(4);
  });

  it.each(catalog.map((entry) => [entry.name, entry] as const))('%s is well formed', (_, entry) => {
    expect(['Weapon', 'Support Equipment']).toContain(entry.kind);
    expect(['Light', 'Medium', 'Heavy']).toContain(entry.class);
    expect(Number.isInteger(entry.bp) && entry.bp > 0).toBe(true);
    expect(entry.shortName).not.toBe('');
    if (entry.kind === 'Weapon') expect(entry.rv).toBeDefined();
    if (entry.rv) {
      expect(entry.rv.normal).toBeGreaterThan(0);
      expect(entry.rv.extended).toBeGreaterThan(entry.rv.normal);
      if (entry.rv.min !== undefined) expect(entry.rv.min).toBeLessThan(entry.rv.normal);
    }
  });

  it('has unique names and unique short names', () => {
    expect(new Set(catalog.map((entry) => entry.name)).size).toBe(catalog.length);
    expect(new Set(catalog.map((entry) => entry.shortName)).size).toBe(catalog.length);
  });

  it('reads a Weapon with a minimum range', () => {
    expect(findCatalogEntry('Medium Missile')).toEqual({
      name: 'Medium Missile',
      kind: 'Weapon',
      class: 'Medium',
      bp: 2,
      rv: { min: 3, normal: 10, extended: 14 },
      hv: 1,
      shortName: 'Md Missile',
    });
  });

  it('reads blank cells as absent values', () => {
    expect(findCatalogEntry('Heavy Laser')).toEqual({
      name: 'Heavy Laser',
      kind: 'Weapon',
      class: 'Heavy',
      bp: 3,
      rv: { normal: 6, extended: 10 },
      hv: 2,
      shortName: 'Hv Laser',
    });
    expect(findCatalogEntry('Anti-Missile Defense System')).toEqual({
      name: 'Anti-Missile Defense System',
      kind: 'Support Equipment',
      class: 'Light',
      bp: 1,
      shortName: 'AMDS',
    });
  });

  it('finds Support Equipment by name, and nothing for an unknown name', () => {
    expect(findCatalogEntry('Improved Weapon Targeting System')?.shortName).toBe('IWTS');
    expect(findCatalogEntry('Autocannon')).toBeUndefined();
  });
});

describe('formatRv', () => {
  it('writes normal and extended range', () => {
    expect(formatRv({ normal: 10, extended: 14 })).toBe('10/14');
  });

  it('leads with the minimum range when there is one', () => {
    expect(formatRv({ min: 3, normal: 10, extended: 14 })).toBe('3-10/14');
  });
});
