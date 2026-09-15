import { describe, expect, it } from 'vitest';
import { armorCrossOut, strengthCrossOut } from './geometry';

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

describe('strengthCrossOut', () => {
  it('crosses out boxes 6–10 and all of row 1 at Sv 5', () => {
    expect(strengthCrossOut(5)).toEqual([
      { x: 131, y: 68, width: 119, height: 20.5 },
      { x: 12, y: 88.5, width: 238, height: 20.5 },
    ]);
  });

  it('crosses out row 1 at Sv 10', () => {
    expect(strengthCrossOut(10)).toEqual([{ x: 12, y: 88.5, width: 238, height: 20.5 }]);
  });
});
