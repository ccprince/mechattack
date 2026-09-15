import { describe, expect, it } from 'vitest';
import { armyListSchema, bpTotal, isOverBpLimit } from './armyList';
import { armyListReducer, type ArmyListState } from './armyListReducer';
import { unitProfileIssues } from './unitProfile';

function state(overrides: Partial<ArmyListState['list']> = {}): ArmyListState {
  return {
    list: { version: 2, name: 'Iron Legion', bpLimit: 40, unitProfiles: [], ...overrides },
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
          armor: 0,
          heatSinks: 0,
          engineUpgrades: 0,
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
      let overLimit = armyListReducer(state({ bpLimit: 0 }), { type: 'addMech' });
      overLimit = armyListReducer(overLimit, {
        type: 'updateUnitProfile',
        id: overLimit.selectedId!,
        changes: { armor: 10 },
      });
      expect(isOverBpLimit(overLimit.list)).toBe(true);
      const next = armyListReducer(overLimit, { type: 'addMech' });
      expect(next.list.unitProfiles).toHaveLength(2);
    });
  });

  describe('addVehicle', () => {
    it('adds a default New Vehicle and selects it', () => {
      const next = armyListReducer(state(), { type: 'addVehicle' });
      expect(next.list.unitProfiles).toEqual([
        {
          kind: 'Vehicle',
          id: expect.any(String),
          name: 'New Vehicle',
          class: 'Light',
          armor: 0,
          engineUpgrades: 0,
          turret: false,
          staticMount: false,
          cargoBays: 0,
          notes: '',
          mounts: { turret: null, staticMount1: null, staticMount2: null },
          quantity: 1,
        },
      ]);
      expect(next.selectedId).toBe(next.list.unitProfiles[0]?.id);
      expect(armyListSchema.safeParse(next.list).success).toBe(true);
    });

    it('suffixes the name so it stays unique, apart from Mech names, with ids unique across both', () => {
      const next = (['addVehicle', 'addMech', 'addVehicle'] as const).reduce(
        (current, type) => armyListReducer(current, { type }),
        state(),
      );
      expect(next.list.unitProfiles.map(({ name }) => name)).toEqual([
        'New Vehicle',
        'New Mech',
        'New Vehicle 2',
      ]);
      expect(armyListSchema.safeParse(next.list).success).toBe(true);
    });
  });

  describe('updateUnitProfile on a Vehicle', () => {
    const oneVehicle = () => armyListReducer(state(), { type: 'addVehicle' });

    it('changes the given fields and mounts one at a time', () => {
      let current = oneVehicle();
      const id = current.selectedId!;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { name: 'Hauler', class: 'Medium', armor: 30, staticMount: true, cargoBays: 1 },
      });
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { mounts: { staticMount1: 'Medium Laser' } },
      });
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { mounts: { staticMount2: 'Light Missile' } },
      });
      expect(current.list.unitProfiles[0]).toMatchObject({
        name: 'Hauler',
        class: 'Medium',
        armor: 30,
        staticMount: true,
        cargoBays: 1,
        mounts: { turret: null, staticMount1: 'Medium Laser', staticMount2: 'Light Missile' },
      });
    });

    it('clears what the Turret or Static Mount held when it is unticked', () => {
      let current = oneVehicle();
      const id = current.selectedId!;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: {
          turret: true,
          staticMount: true,
          mounts: {
            turret: 'Light Laser',
            staticMount1: 'Light Cannon',
            staticMount2: 'Light Missile',
          },
        },
      });
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { staticMount: false },
      });
      expect(current.list.unitProfiles[0]).toMatchObject({
        turret: true,
        staticMount: false,
        mounts: { turret: 'Light Laser', staticMount1: null, staticMount2: null },
      });
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { turret: false },
      });
      expect(current.list.unitProfiles[0]).toMatchObject({
        turret: false,
        mounts: { turret: null, staticMount1: null, staticMount2: null },
      });
      expect(armyListSchema.safeParse(current.list).success).toBe(true);
    });

    it('keeps every Hull Option and mount when a Class change leaves an Issue', () => {
      let current = oneVehicle();
      const id = current.selectedId!;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: {
          class: 'Medium',
          staticMount: true,
          mounts: { staticMount1: 'Medium Laser', staticMount2: null },
        },
      });
      const medium = current.list.unitProfiles[0]!;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id,
        changes: { class: 'Ultra-light' },
      });
      const ultraLight = current.list.unitProfiles[0]!;
      expect(ultraLight).toEqual({ ...medium, class: 'Ultra-light' });
      expect(unitProfileIssues(ultraLight)).toEqual([
        {
          rule: 'mountTooHeavy',
          mount: 'staticMount1',
          name: 'Medium Laser',
          entryClass: 'Medium',
        },
        { rule: 'overHullOptions', used: 2, vehicleClass: 'Ultra-light', hullOptions: 1 },
      ]);
    });

    it('sets the quantity, duplicates and deletes a Vehicle as it would a Mech', () => {
      let current = armyListReducer(oneVehicle(), { type: 'addMech' });
      const [vehicle, mech] = current.list.unitProfiles;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id: vehicle!.id,
        changes: { armor: 20, turret: true, mounts: { turret: 'Light Laser' } },
      });
      current = armyListReducer(current, { type: 'setQuantity', id: vehicle!.id, quantity: 3 });
      expect(bpTotal(current.list)).toBe(3 * (2 + 1));

      current = armyListReducer(current, { type: 'duplicateUnitProfile', id: vehicle!.id });
      const [original, copy] = current.list.unitProfiles;
      expect(copy).toEqual({
        ...original,
        id: expect.any(String),
        name: 'New Vehicle (copy)',
        quantity: 0,
      });
      expect(armyListSchema.safeParse(current.list).success).toBe(true);

      current = armyListReducer(current, { type: 'deleteUnitProfile', id: vehicle!.id });
      expect(current.list.unitProfiles).toEqual([copy, mech]);
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
        changes: { name: 'Ironclad', class: 'Heavy', heatSinks: 2, armor: 110, notes: 'Jump jets' },
      });
      expect(next.list.unitProfiles).toEqual([
        {
          ...first,
          name: 'Ironclad',
          class: 'Heavy',
          heatSinks: 2,
          armor: 110,
          notes: 'Jump jets',
        },
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
      expect(current.list.unitProfiles[0]).toMatchObject({
        hardpoints: {
          leftArm: 'Heavy Laser',
          rightArm: null,
          leftTorso: null,
          rightTorso: 'Improved Weapon Targeting System',
        },
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
        changes: { engineUpgrades: 1 },
      });
      expect(next.selectedId).toBe(before.selectedId);
    });
  });

  describe('setQuantity', () => {
    it('sets how many copies of that Unit Profile are fielded, 0 included', () => {
      let current = armyListReducer(armyListReducer(state(), { type: 'addMech' }), {
        type: 'addMech',
      });
      const [first, second] = current.list.unitProfiles;
      for (const { id } of [first!, second!]) {
        current = armyListReducer(current, {
          type: 'updateUnitProfile',
          id,
          changes: { armor: 10 },
        });
      }
      current = armyListReducer(current, { type: 'setQuantity', id: first!.id, quantity: 3 });
      current = armyListReducer(current, { type: 'setQuantity', id: second!.id, quantity: 0 });
      expect(current.list.unitProfiles.map(({ quantity }) => quantity)).toEqual([3, 0]);
      expect(bpTotal(current.list)).toBe(3);
    });

    it('leaves the Army List alone for an unknown id', () => {
      const before = armyListReducer(state(), { type: 'addMech' });
      expect(armyListReducer(before, { type: 'setQuantity', id: 'missing', quantity: 4 })).toEqual(
        before,
      );
    });
  });

  describe('duplicateUnitProfile', () => {
    it('adds an unfielded "(copy)" after the original, and selects it', () => {
      let current = armyListReducer(armyListReducer(state(), { type: 'addMech' }), {
        type: 'addMech',
      });
      const [first, second] = current.list.unitProfiles;
      current = armyListReducer(current, {
        type: 'updateUnitProfile',
        id: first!.id,
        changes: { name: 'Ironclad ', heatSinks: 3, hardpoints: { leftArm: 'Light Laser' } },
      });
      current = armyListReducer(current, { type: 'duplicateUnitProfile', id: first!.id });

      const [original, copy, last] = current.list.unitProfiles;
      expect(last).toEqual(second);
      expect(copy).toEqual({
        ...original,
        id: expect.any(String),
        name: 'Ironclad (copy)',
        quantity: 0,
      });
      expect(copy!.id).not.toBe(original!.id);
      expect(current.selectedId).toBe(copy!.id);
      expect(armyListSchema.safeParse(current.list).success).toBe(true);
    });

    it('gives a copy of a copy its own id', () => {
      let current = armyListReducer(state(), { type: 'addMech' });
      current = armyListReducer(current, {
        type: 'duplicateUnitProfile',
        id: current.list.unitProfiles[0]!.id,
      });
      current = armyListReducer(current, { type: 'duplicateUnitProfile', id: current.selectedId! });
      expect(current.list.unitProfiles.map(({ name }) => name)).toEqual([
        'New Mech',
        'New Mech (copy)',
        'New Mech (copy) (copy)',
      ]);
      expect(armyListSchema.safeParse(current.list).success).toBe(true);
    });

    it('leaves the Army List alone for an unknown id', () => {
      const before = armyListReducer(state(), { type: 'addMech' });
      expect(armyListReducer(before, { type: 'duplicateUnitProfile', id: 'missing' })).toEqual(
        before,
      );
    });
  });

  describe('deleteUnitProfile', () => {
    const threeMechs = () =>
      [1, 2, 3].reduce((current) => armyListReducer(current, { type: 'addMech' }), state());

    it('removes that Unit Profile, keeping the selection on another', () => {
      const before = threeMechs();
      const [first, second, third] = before.list.unitProfiles;
      const next = armyListReducer(before, { type: 'deleteUnitProfile', id: first!.id });
      expect(next.list.unitProfiles).toEqual([second, third]);
      expect(next.selectedId).toBe(third!.id);
    });

    it('selects the next Unit Profile when deleting the selected one', () => {
      let current = threeMechs();
      const [, second, third] = current.list.unitProfiles;
      current = armyListReducer(current, { type: 'selectUnitProfile', id: second!.id });
      current = armyListReducer(current, { type: 'deleteUnitProfile', id: second!.id });
      expect(current.selectedId).toBe(third!.id);
    });

    it('selects the previous one when deleting the selected last one', () => {
      const before = threeMechs();
      const [, second, third] = before.list.unitProfiles;
      const next = armyListReducer(before, { type: 'deleteUnitProfile', id: third!.id });
      expect(next.selectedId).toBe(second!.id);
    });

    it('clears the selection when deleting the only Unit Profile', () => {
      const before = armyListReducer(state(), { type: 'addMech' });
      const next = armyListReducer(before, {
        type: 'deleteUnitProfile',
        id: before.list.unitProfiles[0]!.id,
      });
      expect(next).toEqual({ ...state(), selectedId: null });
    });

    it('leaves the Army List alone for an unknown id', () => {
      const before = threeMechs();
      expect(armyListReducer(before, { type: 'deleteUnitProfile', id: 'missing' })).toEqual(before);
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
