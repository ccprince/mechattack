import type { ArmyList } from './armyList';
import type { MechProfile } from './mech';
import type { TroopProfile } from './troop';
import type { UnitProfile } from './unitProfile';
import { takenMounts, vehicleMounts, type VehicleProfile } from './vehicle';

export interface ArmyListState {
  list: ArmyList;
  /** The Unit Profile open in the editor. Not saved with the Army List. */
  selectedId: string | null;
}

export type ArmyListAction =
  | { type: 'renameList'; name: string }
  | { type: 'setBpLimit'; bpLimit: number }
  | { type: 'addMech' }
  | { type: 'addVehicle' }
  | { type: 'addTroop' }
  | { type: 'updateUnitProfile'; id: string; changes: UnitProfileChanges }
  | { type: 'setQuantity'; id: string; quantity: number }
  | { type: 'duplicateUnitProfile'; id: string }
  | { type: 'deleteUnitProfile'; id: string }
  | { type: 'selectUnitProfile'; id: string | null };

/**
 * Fields to overwrite, for a Unit Profile of that kind; Hardpoints and Vehicle mounts merge one by
 * one. Kind and id never change.
 */
export type UnitProfileChanges = MechChanges | VehicleChanges | TroopChanges;

type MechChanges = Partial<Omit<MechProfile, 'kind' | 'id' | 'hardpoints'>> & {
  hardpoints?: Partial<MechProfile['hardpoints']>;
};

type VehicleChanges = Partial<Omit<VehicleProfile, 'kind' | 'id' | 'mounts'>> & {
  mounts?: Partial<VehicleProfile['mounts']>;
};

type TroopChanges = Partial<Omit<TroopProfile, 'kind' | 'id'>>;

/** The state for editing `list` from the start: its first Unit Profile open, if it has one. */
export function openArmyList(list: ArmyList): ArmyListState {
  return { list, selectedId: list.unitProfiles[0]?.id ?? null };
}

/**
 * Values are stored as given, not range-checked: the editor parses typed-in values before
 * dispatching, and `armyListSchema` guards saving and loading. Going over the Bp Limit never blocks.
 */
export function armyListReducer(state: ArmyListState, action: ArmyListAction): ArmyListState {
  switch (action.type) {
    case 'renameList':
      return { ...state, list: { ...state.list, name: action.name } };
    case 'setBpLimit':
      return { ...state, list: { ...state.list, bpLimit: action.bpLimit } };
    case 'addMech':
      return addUnitProfile(state, newMech);
    case 'addVehicle':
      return addUnitProfile(state, newVehicle);
    case 'addTroop':
      return addUnitProfile(state, newTroop);
    case 'updateUnitProfile': {
      const { id, changes } = action;
      const { unitProfiles } = state.list;
      if (!hasUnitProfile(state.list, id)) return state;
      return {
        ...state,
        list: {
          ...state.list,
          unitProfiles: unitProfiles.map((profile) =>
            profile.id === id ? applyChanges(profile, changes) : profile,
          ),
        },
      };
    }
    case 'setQuantity':
      return armyListReducer(state, {
        type: 'updateUnitProfile',
        id: action.id,
        changes: { quantity: action.quantity },
      });
    case 'duplicateUnitProfile': {
      const { unitProfiles } = state.list;
      const index = unitProfiles.findIndex((profile) => profile.id === action.id);
      const original = unitProfiles[index];
      if (!original) return state;
      // The name may clash with another Unit Profile's: the editor flags it, it isn't an Issue.
      const copy = {
        ...original,
        id: freeId(state.list),
        name: `${original.name.trim()} (copy)`,
        quantity: 0,
      };
      return {
        list: {
          ...state.list,
          unitProfiles: [
            ...unitProfiles.slice(0, index + 1),
            copy,
            ...unitProfiles.slice(index + 1),
          ],
        },
        selectedId: copy.id,
      };
    }
    case 'deleteUnitProfile': {
      const { unitProfiles } = state.list;
      const index = unitProfiles.findIndex((profile) => profile.id === action.id);
      if (index === -1) return state;
      const remaining = unitProfiles.filter((profile) => profile.id !== action.id);
      // Deleting the open Unit Profile opens its neighbour: the next one, or else the previous.
      const selectedId =
        state.selectedId === action.id
          ? (remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
          : state.selectedId;
      return { list: { ...state.list, unitProfiles: remaining }, selectedId };
    }
    case 'selectUnitProfile': {
      const { id } = action;
      if (id !== null && !hasUnitProfile(state.list, id)) return state;
      return { ...state, selectedId: id };
    }
  }
}

/** Appends a new Unit Profile, named apart from the others, and selects it. */
function addUnitProfile(
  state: ArmyListState,
  create: (id: string, freeName: (base: string) => string) => UnitProfile,
): ArmyListState {
  const names = new Set(state.list.unitProfiles.map(({ name }) => name));
  const profile = create(freeId(state.list), (base) =>
    firstFree((n) => (n === 1 ? base : `${base} ${n}`), names),
  );
  return {
    list: { ...state.list, unitProfiles: [...state.list.unitProfiles, profile] },
    selectedId: profile.id,
  };
}

/**
 * Changes must suit the Unit Profile's kind: fields meant for the other kind aren't checked here.
 * Unticking a Turret or Static Mount empties its mounts. Changing a Troop's Class keeps its Crew
 * Served Weapon.
 */
function applyChanges(profile: UnitProfile, changes: UnitProfileChanges): UnitProfile {
  if (profile.kind === 'Mech') {
    const mechChanges = changes as MechChanges;
    return {
      ...profile,
      ...mechChanges,
      hardpoints: { ...profile.hardpoints, ...mechChanges.hardpoints },
    };
  }
  if (profile.kind === 'Troop') return { ...profile, ...(changes as TroopChanges) };
  const vehicleChanges = changes as VehicleChanges;
  const next = { ...profile, ...vehicleChanges };
  const mounts = { ...profile.mounts, ...vehicleChanges.mounts };
  const taken = takenMounts(next);
  for (const mount of vehicleMounts) if (!taken.includes(mount)) mounts[mount] = null;
  return { ...next, mounts };
}

function hasUnitProfile(list: ArmyList, id: string): boolean {
  return list.unitProfiles.some((profile) => profile.id === id);
}

function freeId(list: ArmyList): string {
  return firstFree((n) => `u${n}`, new Set(list.unitProfiles.map(({ id }) => id)));
}

/** The first of `candidate(1)`, `candidate(2)`, … not already taken. */
function firstFree(candidate: (n: number) => string, taken: ReadonlySet<string>): string {
  for (let n = 1; ; n++) {
    const value = candidate(n);
    if (!taken.has(value)) return value;
  }
}

function newMech(id: string, freeName: (base: string) => string): MechProfile {
  return {
    kind: 'Mech',
    id,
    name: freeName('New Mech'),
    class: 'Light',
    armor: 10,
    heatSinks: 0,
    engineUpgrades: 0,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
  };
}

function newVehicle(id: string, freeName: (base: string) => string): VehicleProfile {
  return {
    kind: 'Vehicle',
    id,
    name: freeName('New Vehicle'),
    class: 'Light',
    armor: 10,
    engineUpgrades: 0,
    turret: false,
    staticMount: false,
    cargoBays: 0,
    notes: '',
    mounts: { turret: null, staticMount1: null, staticMount2: null },
    quantity: 1,
  };
}

function newTroop(id: string, freeName: (base: string) => string): TroopProfile {
  return {
    kind: 'Troop',
    id,
    name: freeName('New Troop'),
    class: 'Light Infantry',
    crewServedWeapon: null,
    notes: '',
    quantity: 1,
  };
}
