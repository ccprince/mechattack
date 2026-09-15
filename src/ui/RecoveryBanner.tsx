import { discardBackup, type KeyValueStore } from '../domain/armyListStorage';
import styles from './RecoveryBanner.module.css';

/**
 * Offers the unreadable save kept in the backup key. Stays up, across reloads too, until the player
 * downloads or discards it; either way the backup is cleared.
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
    downloadText(backup, 'mech-attack-army-list-backup.json', 'application/json');
    close();
  }

  function close() {
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
      <button type="button" onClick={close}>
        Discard
      </button>
    </div>
  );
}

/** Saves `text` as-is, so the raw backup comes back byte for byte. */
function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoked after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url));
}
