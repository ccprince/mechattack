import { describe, expect, it } from 'vitest';
import { armorCrossOut } from './geometry';

describe('armorCrossOut', () => {
  it('crosses out every Mech armor row above the starting Armor', () => {
    expect(armorCrossOut(110, 150)).toEqual({ x: 44, y: 90, width: 206, height: 80 });
  });

  it('crosses out nothing at full Armor', () => {
    expect(armorCrossOut(150, 150)).toBeNull();
  });

  it('crosses out the whole grid but one row at the lowest Armor', () => {
    expect(armorCrossOut(10, 60)).toEqual({ x: 44, y: 90, width: 206, height: 100 });
  });
});
