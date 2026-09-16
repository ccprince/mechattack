import { useEffect, useState } from 'react';
import type { ArmyList } from '../domain/armyList';
import { saveArmyList, type KeyValueStore } from '../domain/armyListStorage';

/** Saves the Army List with this id whenever it changes; true while storage refuses the saves. */
export function useAutosave(store: KeyValueStore, id: string | undefined, list: ArmyList): boolean {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Storage is the external system here: its answer is only known once the save is attempted,
    // and React skips the re-render while the answer stays the same.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(!saveArmyList(store, id, list));
  }, [store, id, list]);

  return failed;
}
