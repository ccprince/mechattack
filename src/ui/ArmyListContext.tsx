import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { ArmyList } from '../domain/armyList';
import {
  armyListReducer,
  type ArmyListAction,
  type ArmyListState,
} from '../domain/armyListReducer';
import type { KeyValueStore } from '../domain/armyListStorage';
import { useAutosave } from './useAutosave';

const freshList: ArmyList = { version: 2, name: 'New Army List', bpLimit: 50, unitProfiles: [] };

const ArmyListContext = createContext<
  | {
      state: ArmyListState;
      dispatch: Dispatch<ArmyListAction>;
      /** Where the Army List autosaves, and its backup lives. */
      store: KeyValueStore;
      autosaveFailed: boolean;
    }
  | undefined
>(undefined);

/** Holds the Army List, starting from `savedList` (or a fresh one), and autosaves every change. */
export function ArmyListProvider({
  store,
  savedList,
  children,
}: {
  store: KeyValueStore;
  savedList: ArmyList | undefined;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(armyListReducer, savedList, (list = freshList) => ({
    list,
    selectedId: list.unitProfiles[0]?.id ?? null,
  }));
  const autosaveFailed = useAutosave(store, state.list);

  return (
    <ArmyListContext value={{ state, dispatch, store, autosaveFailed }}>{children}</ArmyListContext>
  );
}

export function useArmyList() {
  const context = useContext(ArmyListContext);
  if (!context) throw new Error('useArmyList must be used inside an ArmyListProvider.');
  return context;
}

export function useSelectedUnitProfile() {
  const { list, selectedId } = useArmyList().state;
  return list.unitProfiles.find((profile) => profile.id === selectedId);
}
