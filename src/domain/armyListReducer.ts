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
      const ids = new Set(unitProfiles.map(({ id }) => id));
      const names = new Set(unitProfiles.map(({ name }) => name));
      const mech = newMech(
        firstFree((n) => `u${n}`, ids),
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
