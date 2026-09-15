import type { ArmyList } from './armyList';
import type { MechProfile } from './mech';

export interface ArmyListState {
  list: ArmyList;
  /** The Unit Profile open in the editor. Not saved with the Army List. */
  selectedId: string | null;
}

export type ArmyListAction =
  | { type: 'renameList'; name: string }
  | { type: 'setBpLimit'; bpLimit: number }
  | { type: 'addMech' }
  | { type: 'updateUnitProfile'; id: string; changes: UnitProfileChanges }
  | { type: 'setQuantity'; id: string; quantity: number }
  | { type: 'duplicateUnitProfile'; id: string }
  | { type: 'deleteUnitProfile'; id: string }
  | { type: 'selectUnitProfile'; id: string | null };

/** Fields to overwrite; Hardpoints merge one by one. Kind and id never change. */
export type UnitProfileChanges = Partial<Omit<MechProfile, 'kind' | 'id' | 'hardpoints'>> & {
  hardpoints?: Partial<MechProfile['hardpoints']>;
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
    case 'addMech': {
      const { unitProfiles } = state.list;
      const names = new Set(unitProfiles.map(({ name }) => name));
      const mech = newMech(
        freeId(state.list),
        firstFree((n) => (n === 1 ? 'New Mech' : `New Mech ${n}`), names),
      );
      return {
        list: { ...state.list, unitProfiles: [...state.list.unitProfiles, mech] },
        selectedId: mech.id,
      };
    }
    case 'updateUnitProfile': {
      const { id, changes } = action;
      const { unitProfiles } = state.list;
      if (!hasUnitProfile(state.list, id)) return state;
      return {
        ...state,
        list: {
          ...state.list,
          unitProfiles: unitProfiles.map((profile) =>
            profile.id === id
              ? {
                  ...profile,
                  ...changes,
                  hardpoints: { ...profile.hardpoints, ...changes.hardpoints },
                }
              : profile,
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

function newMech(id: string, name: string): MechProfile {
  return {
    kind: 'Mech',
    id,
    name,
    class: 'Light',
    bp: 1,
    mv: 0,
    tp: 0,
    hc: 0,
    armor: 0,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
  };
}
