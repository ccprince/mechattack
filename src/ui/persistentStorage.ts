/**
 * Browsers may clear a site's storage on their own, Saved Army Lists with it (#67). The Storage API
 * asks them not to. It's missing in older browsers and some private windows, so every call here copes
 * without it and never throws.
 */

/** `navigator.storage`, which the DOM types claim is always there. */
const storageManager = () => navigator.storage as StorageManager | undefined;

/** Whether the browser has agreed not to clear this site's storage on its own; false if it can't say. */
export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await storageManager()?.persisted?.()) === true;
  } catch {
    return false;
  }
}

/**
 * Returns what to call whenever a Saved Army List changes. The first call asks the browser to keep
 * storage, unless it already has; later calls do nothing. Made once per page load: browsers decide by
 * heuristics such as engagement, so a later load's ask can succeed where this one didn't.
 */
export function askToPersistOncePerLoad(): () => void {
  let asked = false;
  return () => {
    if (asked) return;
    asked = true;
    void (async () => {
      try {
        if (await isStoragePersisted()) return;
        await storageManager()?.persist?.();
      } catch {
        // The browser said no, or can't be asked: nothing a player could do about it here.
      }
    })();
  };
}
