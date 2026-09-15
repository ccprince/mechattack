import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  armyListReducer,
  type ArmyListAction,
  type ArmyListState,
} from '../domain/armyListReducer';

// In memory only for now: every visit starts from this empty list.
const initialState: ArmyListState = {
  list: { version: 1, name: 'New Army List', bpLimit: 50, unitProfiles: [] },
  selectedId: null,
};

const ArmyListContext = createContext<
  { state: ArmyListState; dispatch: Dispatch<ArmyListAction> } | undefined
>(undefined);

export function ArmyListProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(armyListReducer, initialState);
  return <ArmyListContext value={{ state, dispatch }}>{children}</ArmyListContext>;
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
