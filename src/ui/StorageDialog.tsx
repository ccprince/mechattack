import { useId, type RefObject } from 'react';
import styles from './StorageDialog.module.css';

/**
 * Says where Army Lists are kept and what loses them, which the footer's one line can't (#50). Opened
 * with `showModal()`, which returns focus on close to whatever opened it.
 */
export function StorageDialog({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const titleId = useId();
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}>
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
      <p>
        Some browsers clear saved data on their own, such as Safari on iPhone and iPad after about a
        week without a visit.
      </p>
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
