import { describe, expect, it } from 'vitest';
import { armyListSchema, isOverBpLimit } from './armyList';
import { armyListReducer, type ArmyListState } from './armyListReducer';

function state(overrides: Partial<ArmyListState['list']> = {}): ArmyListState {
  return {
    list: { version: 1, name: 'Iron Legion', bpLimit: 40, unitProfiles: [], ...overrides },
    selectedId: null,
  };
}

describe('armyListReducer', () => {
  it('renames the Army List', () => {
    const next = armyListReducer(state(), { type: 'renameList', name: 'Steel Hand' });
    expect(next.list.name).toBe('Steel Hand');
  });

  it('sets the Bp Limit', () => {
    const next = armyListReducer(state(), { type: 'setBpLimit', bpLimit: 60 });
    expect(next.list.bpLimit).toBe(60);
  });

  describe('addMech', () => {
    it('adds a default New Mech and selects it', () => {
      const next = armyListReducer(state(), { type: 'addMech' });
      expect(next.list.unitProfiles).toEqual([
        {
          kind: 'Mech',
          id: expect.any(String),
          name: 'New Mech',
          class: 'Light',
          bp: 1,
          mv: 0,
          tp: 0,
          hc: 0,
          armor: 0,
          notes: '',
          hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
          quantity: 1,
        },
      ]);
      expect(next.selectedId).toBe(next.list.unitProfiles[0]?.id);
    });

    it('suffixes the name so it stays unique', () => {
      const next = [1, 2, 3].reduce(
        (current) => armyListReducer(current, { type: 'addMech' }),
        state(),
      );
      expect(next.list.unitProfiles.map(({ name }) => name)).toEqual([
        'New Mech',
        'New Mech 2',
        'New Mech 3',
      ]);
      expect(next.selectedId).toBe(next.list.unitProfiles[2]?.id);
      expect(armyListSchema.safeParse(next.list).success).toBe(true);
    });

    it('takes the first free suffix after a rename', () => {
      let current = armyListReducer(state(), { type: 'addMech' });
      current = armyListReducer(current, { type: 'addMech' });
      const [first] = current.list.unitProfiles;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id: first!.id,
        changes: { name: 'Ironclad' },
      });
      current = armyListReducer(current, { type: 'addMech' });
      expect(current.list.unitProfiles.map(({ name }) => name)).toEqual([
        'Ironclad',
        'New Mech 2',
        'New Mech',
      ]);
      expect(armyListSchema.safeParse(current.list).success).toBe(true);
    });

    it('still adds a Mech when the Army List is over its Bp Limit', () => {
      const overLimit = armyListReducer(state({ bpLimit: 0 }), { type: 'addMech' });
      expect(isOverBpLimit(overLimit.list)).toBe(true);
      const next = armyListReducer(overLimit, { type: 'addMech' });
      expect(next.list.unitProfiles).toHaveLength(2);
    });
  });

  describe('updateUnitProfile', () => {
    const twoMechs = () =>
      armyListReducer(armyListReducer(state(), { type: 'addMech' }), { type: 'addMech' });

    it('changes only the given fields of that Unit Profile', () => {
      const before = twoMechs();
      const [first, second] = before.list.unitProfiles;
      const next = armyListReducer(before, {
        type: 'updateUnitProfile',
        id: first!.id,
        changes: { name: 'Ironclad', class: 'Heavy', bp: 18, armor: 110, notes: 'Jump jets' },
      });
      expect(next.list.unitProfiles).toEqual([
        { ...first, name: 'Ironclad', class: 'Heavy', bp: 18, armor: 110, notes: 'Jump jets' },
        second,
      ]);
    });

    it('mounts on one Hardpoint without clearing the others', () => {
      let current = twoMechs();
      const id = current.list.unitProfiles[0]!.id;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { hardpoints: { leftArm: 'Heavy Laser' } },
      });
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { hardpoints: { rightTorso: 'Improved Weapon Targeting System' } },
      });
      expect(current.list.unitProfiles[0]?.hardpoints).toEqual({
        leftArm: 'Heavy Laser',
        rightArm: null,
        leftTorso: null,
        rightTorso: 'Improved Weapon Targeting System',
      });
    });

    it('leaves the Army List alone for an unknown id', () => {
      const before = twoMechs();
      const next = armyListReducer(before, {
        type: 'updateUnitProfile',
        id: 'missing',
        changes: { name: 'Ghost' },
      });
      expect(next).toEqual(before);
    });

    it('keeps the selection', () => {
      const before = twoMechs();
      const next = armyListReducer(before, {
        type: 'updateUnitProfile',
        id: before.list.unitProfiles[0]!.id,
        changes: { mv: 4 },
      });
      expect(next.selectedId).toBe(before.selectedId);
    });
  });

  describe('selectUnitProfile', () => {
    it('selects a Unit Profile on the list', () => {
      const before = armyListReducer(armyListReducer(state(), { type: 'addMech' }), {
        type: 'addMech',
      });
      const first = before.list.unitProfiles[0]!;
      expect(before.selectedId).not.toBe(first.id);
      const next = armyListReducer(before, { type: 'selectUnitProfile', id: first.id });
      expect(next).toEqual({ ...before, selectedId: first.id });
    });

    it('clears the selection', () => {
      const before = armyListReducer(state(), { type: 'addMech' });
      expect(
        armyListReducer(before, { type: 'selectUnitProfile', id: null }).selectedId,
      ).toBeNull();
    });

    it('ignores an id that is not on the list', () => {
      const before = armyListReducer(state(), { type: 'addMech' });
      expect(armyListReducer(before, { type: 'selectUnitProfile', id: 'missing' })).toEqual(before);
    });
  });
});
