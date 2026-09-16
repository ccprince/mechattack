import { useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { isStoragePersisted } from './persistentStorage';
import styles from './StorageDialog.module.css';

export type StorageDialogHandle = { show: () => void };

/**
 * Says where Army Lists are kept and what loses them, which the footer's one line can't (#50). Shown
 * modally, which returns focus on close to whatever opened it. Whether the browser has agreed to keep
 * them is checked on each opening (#67).
 */
export function StorageDialog({ ref }: { ref: Ref<StorageDialogHandle> }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [persisted, setPersisted] = useState(false);

  useImperativeHandle(ref, () => ({
    show() {
      // Unknown until the browser answers, so the dialog never opens on a stale agreement.
      setPersisted(false);
      void isStoragePersisted().then(setPersisted);
      const element = dialog.current!;
      element.showModal();
      // Opening focuses Close, the last thing in it, which on a short screen scrolls the reader past
      // the whole explanation. The dialog takes focus instead, so it opens at the top.
      element.focus();
      element.scrollTop = 0;
    },
  }));

  return (
    <dialog ref={dialog} tabIndex={-1} className={styles.dialog} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Where your Army Lists are kept
      </h2>
      <p>
        Every Army List you make is saved in this browser, on this device, as you edit. Nothing is
        uploaded: there's no server, and the PDF is built right here too.
      </p>
      <p>
        <strong>They stay</strong> when you close the tab, reload, or come back another day.
      </p>
      <p>
        <strong>They're lost</strong> if you:
      </p>
      <ul>
        <li>clear this site's data, or your browser's history and site data</li>
        <li>reset or uninstall the browser</li>
      </ul>
      <p>
        <strong>They won't be there</strong> in a different browser, on another device, or in a
        private window. A private window's lists are lost when it closes.
      </p>
      {persisted ? (
        <p>
          <strong>This browser has agreed</strong> not to clear them on its own, though they're
          still lost in the cases above.
        </p>
      ) : (
        <p>
          Some browsers, such as Safari on iPhone and iPiad, clear saved data on their own after
          about a week without a visit.
        </p>
      )}
      <p>
        <strong>To keep a copy</strong> or move a list to another device, open the Army Lists menu
        and choose <strong>Export Army List</strong>. It saves the open Army List as a file;{' '}
        <strong>Import Army List…</strong> brings it back.
      </p>
      <form method="dialog" className={styles.actions}>
        <button type="submit">Close</button>
      </form>
    </dialog>
  );
}
