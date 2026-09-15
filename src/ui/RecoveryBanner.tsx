import { discardBackup, type KeyValueStore } from '../domain/armyListStorage';
import styles from './RecoveryBanner.module.css';

/**
 * Offers the unreadable save kept in the backup key. Stays up, across reloads too, until the player
 * downloads or discards it. Only Discard clears the backup: a download can be blocked or cancelled.
 */
export function RecoveryBanner({
  store,
  backup,
  onClose,
}: {
  store: KeyValueStore;
  backup: string;
  onClose: () => void;
}) {
  function download() {
    downloadJson(backup, 'mech-attack-army-list-backup.json');
    onClose();
  }

  function discard() {
    discardBackup(store);
    onClose();
  }

  return (
    <div role="alert" className={styles.banner}>
      <p className={styles.message}>
        Your saved Army List couldn't be read, so a new one was started.
      </p>
      <button type="button" onClick={download}>
        Download it
      </button>
      <button type="button" onClick={discard}>
        Discard
      </button>
    </div>
  );
}

/** Saves `text` as-is, so the raw backup comes back byte for byte. */
function downloadJson(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoked after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url));
}
