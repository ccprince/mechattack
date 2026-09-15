import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { ArmyList } from '../domain/armyList';
import {
  armyListReducer,
  type ArmyListAction,
  type ArmyListState,
} from '../domain/armyListReducer';
import { saveArmyList, type KeyValueStore } from '../domain/armyListStorage';

const freshList: ArmyList = { version: 1, name: 'New Army List', bpLimit: 50, unitProfiles: [] };

const ArmyListContext = createContext<
  { state: ArmyListState; dispatch: Dispatch<ArmyListAction>; autosaveFailed: boolean } | undefined
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
  const [autosaveFailed, setAutosaveFailed] = useState(false);

  useEffect(() => {
    // Storage is the external system here: its answer is only known once the save is attempted,
    // and React skips the re-render while the answer stays the same.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutosaveFailed(!saveArmyList(store, state.list));
  }, [store, state.list]);

  return <ArmyListContext value={{ state, dispatch, autosaveFailed }}>{children}</ArmyListContext>;
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
