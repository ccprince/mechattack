import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './Dialog.module.css';

export type Confirmation = {
  /** The question, such as `Delete Ironclad?`. It names the dialog. */
  question: string;
  /** Says more under the question, such as what can't be undone. */
  detail?: string;
  /** The answer that goes ahead, such as `Delete`. */
  confirm: string;
  /** Whether going ahead destroys something, which colours its answer as danger. */
  destructive?: boolean;
};

type Confirm = (confirmation: Confirmation) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | undefined>(undefined);

/**
 * Asks before acting, in place of `window.confirm`, which looks out of place (#84). `confirm` resolves
 * true only for the answer that goes ahead: Cancel and Escape resolve false. Shown modally, which hands
 * focus back to whatever asked once it closes.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const titleId = useId();
  const detailId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [asking, setAsking] = useState<Confirmation>();
  const answer = useRef<(yes: boolean) => void>(undefined);

  // Opened once the question has rendered, so it's read with its words already in place.
  useLayoutEffect(() => {
    const element = dialog.current!;
    if (asking && !element.open) element.showModal();
  }, [asking]);

  const confirm: Confirm = (confirmation) =>
    new Promise((resolve) => {
      // Only one question at a time: a newer one answers the older with a no.
      answer.current?.(false);
      answer.current = resolve;
      setAsking(confirmation);
    });

  // Every way out closes the dialog; only the answer that goes ahead returns `confirm`.
  function close() {
    const element = dialog.current!;
    answer.current?.(element.returnValue === 'confirm');
    answer.current = undefined;
    element.returnValue = '';
    setAsking(undefined);
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      <dialog
        ref={dialog}
        role="alertdialog"
        className={`${styles.dialog} ${styles.narrow}`}
        aria-labelledby={titleId}
        aria-describedby={asking?.detail ? detailId : undefined}
        onClose={close}
      >
        {asking && (
          <>
            <h2 id={titleId} className={styles.title}>
              {asking.question}
            </h2>
            {asking.detail && <p id={detailId}>{asking.detail}</p>}
            <form method="dialog" className={styles.actions}>
              {/* First, so opening focuses it: Enter never goes ahead by accident. */}
              <button type="submit" value="cancel">
                Cancel
              </button>
              <button
                type="submit"
                value="confirm"
                className={asking.destructive ? styles.danger : undefined}
              >
                {asking.confirm}
              </button>
            </form>
          </>
        )}
      </dialog>
    </ConfirmContext>
  );
}

/** Asks the player to confirm, resolving true if they go ahead. */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm needs a ConfirmProvider.');
  return confirm;
}
