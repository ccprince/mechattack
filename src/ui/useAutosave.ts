import { useEffect, useRef, useState } from 'react';
import type { ArmyList } from '../domain/armyList';
import { saveArmyList, type KeyValueStore } from '../domain/armyListStorage';

/**
 * Saves the Army List with this id whenever it changes; true while storage refuses the saves. Calls
 * `onChange` after each successful save of an edit, but not after the save on mount, which only stores
 * what opened.
 */
export function useAutosave(
  store: KeyValueStore,
  id: string | undefined,
  list: ArmyList,
  onChange: () => void,
): boolean {
  const [failed, setFailed] = useState(false);
  // Compared by identity, not by counting runs: Strict Mode runs the mount effect twice.
  const opened = useRef(list);

  useEffect(() => {
    const saved = saveArmyList(store, id, list);
    // Storage is the external system here: its answer is only known once the save is attempted,
    // and React skips the re-render while the answer stays the same.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(!saved);
    if (saved && list !== opened.current) onChange();
    // `onChange` is left out: a new callback on a re-render isn't a change to save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, id, list]);

  return failed;
}
