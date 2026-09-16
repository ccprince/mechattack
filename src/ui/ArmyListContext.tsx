import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  armyListReducer,
  openArmyList,
  type ArmyListAction,
  type ArmyListState,
} from '../domain/armyListReducer';
import type { KeyValueStore, SavedArmyList } from '../domain/armyListStorage';
import { useAutosave } from './useAutosave';

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

/** Holds the Open Army List, starting from `saved`, and autosaves every change. */
export function ArmyListProvider({
  store,
  saved,
  children,
}: {
  store: KeyValueStore;
  saved: SavedArmyList;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(armyListReducer, saved.list, openArmyList);
  const autosaveFailed = useAutosave(store, saved.id, state.list);

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
