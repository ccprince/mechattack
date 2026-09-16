import { useState } from 'react';
import { newArmyList } from '../domain/armyList';
import {
  addSavedArmyList,
  deleteSavedArmyList,
  listSavedArmyLists,
  switchSavedArmyList,
} from '../domain/armyListStorage';
import { useArmyList } from './ArmyListContext';
import { changedLabel } from './changedLabel';
import styles from './ArmyListHeader.module.css';

/** Switches between Saved Army Lists, and makes, copies and deletes them. */
export function SavedArmyListPicker() {
  const { state, store, openId, switchList } = useArmyList();
  const { list } = state;
  // Read from storage when the picker is used, not on every edit: each read parses every list.
  const [summaries, setSummaries] = useState(() => listSavedArmyLists(store));
  const [now, setNow] = useState(() => new Date());

  function refresh() {
    setSummaries(listSavedArmyLists(store));
    setNow(new Date());
  }

  const options = summaries.map(({ id, name, changed }) => {
    // The Open Army List's name follows its field as it's typed.
    const shown = id === openId ? list.name : name;
    return { id, text: `${displayName(shown)} · ${changedLabel(changed, now)}` };
  });
  // Storage couldn't keep the Open Army List, so it isn't among them; it's still the one shown.
  if (openId === undefined) options.unshift({ id: '', text: displayName(list.name) });

  function remove() {
    if (window.confirm(`Delete ${displayName(list.name)}? This can't be undone.`)) {
      switchList((store) => deleteSavedArmyList(store, openId));
    }
  }

  return (
    <div className={styles.listControls}>
      <label className={styles.picker}>
        <span>Saved Army Lists</span>
        <select
          value={openId ?? ''}
          onFocus={refresh}
          onPointerDown={refresh}
          onChange={(event) => {
            const id = event.target.value;
            if (id !== '') switchList((store) => switchSavedArmyList(store, id));
          }}
        >
          {options.map(({ id, text }) => (
            <option key={id} value={id}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => switchList((store) => addSavedArmyList(store, newArmyList()))}
      >
        New Army List
      </button>
      <button
        type="button"
        onClick={() =>
          switchList((store) =>
            addSavedArmyList(store, { ...list, name: `${displayName(list.name)} (copy)` }),
          )
        }
      >
        Duplicate Army List
      </button>
      <button type="button" onClick={remove}>
        Delete Army List
      </button>
    </div>
  );
}

/** A blank name is shown as untitled; `undefined` is a list that couldn't be read. */
function displayName(name: string | undefined): string {
  if (name === undefined) return 'Unreadable Army List';
  return name.trim() || 'Untitled Army List';
}
