import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  armyListReducer,
  openArmyList,
  type ArmyListAction,
  type ArmyListState,
} from '../domain/armyListReducer';
import { saveArmyList, type KeyValueStore, type SavedArmyList } from '../domain/armyListStorage';
import { useAutosave } from './useAutosave';

const ArmyListContext = createContext<
  | {
      state: ArmyListState;
      dispatch: Dispatch<ArmyListAction>;
      /** Where the Army List autosaves, and its backup lives. */
      store: KeyValueStore;
      autosaveFailed: boolean;
      /** The Open Army List's id, undefined if storage couldn't keep it. */
      openId: string | undefined;
      /** Saves the Open Army List, then opens the Saved Army List `open` returns in its place. */
      switchList: (open: (store: KeyValueStore) => SavedArmyList) => void;
    }
  | undefined
>(undefined);

/**
 * Holds the Open Army List, starting from `saved`, and autosaves every change. Switching lists hands the
 * next one to `onSwitch`, which remounts the provider with it.
 */
export function ArmyListProvider({
  store,
  saved,
  onSwitch,
  children,
}: {
  store: KeyValueStore;
  saved: SavedArmyList;
  onSwitch: (next: SavedArmyList) => void;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(armyListReducer, saved.list, openArmyList);
  const autosaveFailed = useAutosave(store, saved.id, state.list);

  function switchList(open: (store: KeyValueStore) => SavedArmyList) {
    // Autosave has most likely stored it already; this makes sure before the provider remounts.
    saveArmyList(store, saved.id, state.list);
    onSwitch(open(store));
  }

  return (
    <ArmyListContext
      value={{ state, dispatch, store, autosaveFailed, openId: saved.id, switchList }}
    >
      {children}
    </ArmyListContext>
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
