import { useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent } from 'react';
import { newArmyList } from '../domain/armyList';
import { armyListFilename, parseArmyList, serializeArmyList } from '../domain/armyListDocument';
import {
  deleteSavedArmyList,
  listSavedArmyLists,
  switchSavedArmyList,
} from '../domain/armyListStorage';
import styles from './ArmyListsMenu.module.css';
import { useArmyList } from './ArmyListContext';
import { changedLabel } from './changedLabel';
import { downloadJson } from './downloadJson';
import { MenuIcon } from './icons';

/**
 * The Army Lists menu (ADR 0008): the Saved Army Lists to switch between, then what makes, copies,
 * exports and deletes them. A disclosure button opening a popover of plain buttons, not an ARIA menu.
 */
export function ArmyListsMenu({
  focusOnMount,
  onError,
  onExplainStorage,
}: {
  /**
   * Takes focus when it mounts. Switching lists remounts the editor, which would otherwise drop focus
   * to the page, so the button that did it gets it back.
   */
  focusOnMount: boolean;
  onError: (message: string | undefined) => void;
  /** Opens the dialog saying where Army Lists are kept (#50). */
  onExplainStorage: () => void;
}) {
  const { state, store, openId, switchList, addList } = useArmyList();
  const { list } = state;
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  // Read from storage each time the menu opens, not on every edit: each read parses every list.
  const [summaries, setSummaries] = useState(() => listSavedArmyLists(store));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (focusOnMount) button.current?.focus();
    // Once, on mount: a switch mounts a new menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = summaries.map(({ id: listId, name, changed }) => ({
    id: listId,
    // The Open Army List's name follows its field as it's typed.
    name: displayName(listId === openId ? list.name : name),
    changed: changedLabel(changed, now),
  }));
  // Storage couldn't keep the Open Army List, so it isn't among them; it's still the one open.
  if (openId === undefined) entries.unshift({ id: '', name: displayName(list.name), changed: '' });

  /** Closes the menu, then acts: closing first hands focus back to the button. */
  function choose(act: () => void) {
    popover.current?.hidePopover();
    act();
  }

  /**
   * A popover closes on Esc or a click outside, but not when Tab or Shift+Tab takes focus out of it.
   * Only a real destination counts: a click on something that can't take focus has none, and closing
   * then would hide an item before its click lands.
   */
  function closeWhenFocusLeaves(event: FocusEvent<HTMLElement>) {
    const menu = popover.current!;
    const to = event.relatedTarget;
    if (!to || menu.contains(to) || to === button.current) return;
    if (menu.matches(':popover-open')) menu.hidePopover();
  }

  function remove() {
    if (window.confirm(`Delete ${displayName(list.name)}? This can't be undone.`)) {
      switchList((store) => deleteSavedArmyList(store, openId));
    }
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared so picking the same file again still fires a change.
    input.value = '';
    if (!file) return;
    onError(undefined);
    let text;
    try {
      text = await file.text();
    } catch {
      onError(`Couldn't read ${file.name}, so nothing was imported.`);
      return;
    }
    const imported = parseArmyList(text);
    if (!imported) {
      onError(`Couldn't import ${file.name}: it isn't a readable Army List.`);
      return;
    }
    // Added alongside the Open Army List, never over it, so there's nothing to confirm.
    addList(imported);
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-label="Army Lists"
        aria-expanded={open}
        popoverTarget={menuId}
      >
        <MenuIcon />
      </button>
      <div
        ref={popover}
        id={menuId}
        popover="auto"
        className={styles.menu}
        onBeforeToggle={(event) => {
          if (event.newState !== 'open') return;
          setSummaries(listSavedArmyLists(store));
          setNow(new Date());
          // Under the button, right edges aligned, until anchor positioning reaches Firefox. The pixel
          // gap and screen margin are set from script, so they can't come from the spacing tokens.
          const { bottom, right } = button.current!.getBoundingClientRect();
          popover.current!.style.top = `${bottom + 4}px`;
          popover.current!.style.right = `${Math.max(8, innerWidth - right)}px`;
        }}
        onToggle={(event) => setOpen(event.newState === 'open')}
        onBlur={closeWhenFocusLeaves}
      >
        <div id={`${menuId}-lists`} className={styles.heading}>
          Saved Army Lists
        </div>
        <div role="group" aria-labelledby={`${menuId}-lists`} className={styles.lists}>
          {entries.map((entry) => {
            const current = entry.id === (openId ?? '');
            return (
              <button
                key={entry.id}
                type="button"
                className={styles.list}
                aria-current={current || undefined}
                onClick={() =>
                  choose(() => {
                    if (!current) switchList((store) => switchSavedArmyList(store, entry.id));
                  })
                }
              >
                <span className={styles.name}>{entry.name}</span>
                {entry.changed && (
                  <span className={styles.changed}>
                    {/* Heard, not seen: the time sits in its own column. */}
                    <span className={styles.visuallyHidden}>, </span>
                    {entry.changed}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <hr className={styles.separator} />
        <button
          type="button"
          className={styles.item}
          onClick={() => choose(() => addList(newArmyList()))}
        >
          New Army List
        </button>
        <button
          type="button"
          className={styles.item}
          onClick={() => choose(() => fileInput.current?.click())}
        >
          Import Army List…
        </button>
        <hr className={styles.separator} />
        <button
          type="button"
          className={styles.item}
          onClick={() =>
            choose(() => addList({ ...list, name: `${displayName(list.name)} (copy)` }))
          }
        >
          Duplicate Army List
        </button>
        <button
          type="button"
          className={styles.item}
          onClick={() =>
            choose(() => downloadJson(serializeArmyList(list), armyListFilename(list.name)))
          }
        >
          Export Army List
        </button>
        <hr className={styles.separator} />
        <button type="button" className={styles.danger} onClick={() => choose(remove)}>
          Delete Army List…
        </button>
        {/* Not an action on a list, so apart from them. Closing the menu first hands focus back to
            its button, which is where the dialog returns it. */}
        <hr className={styles.separator} />
        <button type="button" className={styles.item} onClick={() => choose(onExplainStorage)}>
          Where are Army Lists kept?
        </button>
      </div>
      {/* Opened by Import Army List…: a bare file input can't be labelled or styled like the items. */}
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={importJson}
      />
    </>
  );
}

/** A blank name is shown as untitled; `undefined` is a list that couldn't be read. */
function displayName(name: string | undefined): string {
  if (name === undefined) return 'Unreadable Army List';
  return name.trim() || 'Untitled Army List';
}
