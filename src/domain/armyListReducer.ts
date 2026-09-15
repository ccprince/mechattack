import type { ArmyList } from './armyList';
import type { MechProfile } from './mech';
import type { UnitProfile } from './unitProfile';
import type { VehicleProfile } from './vehicle';

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
  | { type: 'updateUnitProfile'; id: string; changes: UnitProfileChanges }
  | { type: 'setQuantity'; id: string; quantity: number }
  | { type: 'duplicateUnitProfile'; id: string }
  | { type: 'deleteUnitProfile'; id: string }
  | { type: 'selectUnitProfile'; id: string | null };

/**
 * Fields to overwrite, for a Unit Profile of that kind; Hardpoints and Vehicle mounts merge one by
 * one. Kind and id never change.
 */
export type UnitProfileChanges = MechChanges | VehicleChanges;

type MechChanges = Partial<Omit<MechProfile, 'kind' | 'id' | 'hardpoints'>> & {
  hardpoints?: Partial<MechProfile['hardpoints']>;
};

type VehicleChanges = Partial<Omit<VehicleProfile, 'kind' | 'id' | 'mounts'>> & {
  mounts?: Partial<VehicleProfile['mounts']>;
};

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
  create: (id: string, name: (base: string) => string) => UnitProfile,
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
 * Changes meant for the other kind of Unit Profile are a caller's mistake; the schema rejects what
 * they leave behind when saving. Unticking a Turret or Static Mount empties its mounts.
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
  const vehicleChanges = changes as VehicleChanges;
  const next = {
    ...profile,
    ...vehicleChanges,
    mounts: { ...profile.mounts, ...vehicleChanges.mounts },
  };
  if (!next.turret) next.mounts.turret = null;
  if (!next.staticMount) {
    next.mounts.staticMount1 = null;
    next.mounts.staticMount2 = null;
  }
  return next;
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

function newMech(id: string, name: (base: string) => string): MechProfile {
  return {
    kind: 'Mech',
    id,
    name: name('New Mech'),
    class: 'Light',
    armor: 0,
    heatSinks: 0,
    engineUpgrades: 0,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
  };
}

function newVehicle(id: string, name: (base: string) => string): VehicleProfile {
  return {
    kind: 'Vehicle',
    id,
    name: name('New Vehicle'),
    class: 'Light',
    armor: 0,
    engineUpgrades: 0,
    turret: false,
    staticMount: false,
    cargoBays: 0,
    notes: '',
    mounts: { turret: null, staticMount1: null, staticMount2: null },
    quantity: 1,
  };
}
