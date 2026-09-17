import { useState } from 'react';
import type { Measure } from '../cards/fitText';
import { cardsPdfFilename, printSizeLabels, printSizes, type PrintSize } from '../cards/pageLayout';
import {
  bpLimitRange,
  bpTotal,
  fieldedWithIssues,
  hasFieldedCopies,
  isOverBpLimit,
} from '../domain/armyList';
import styles from './ArmyListHeader.module.css';
import { useArmyList } from './ArmyListContext';
import { useConfirm } from './ConfirmContext';
import { NumberField } from './NumberField';

export function ArmyListHeader({
  measure,
  onError,
}: {
  /** Measures card text; undefined until the card fonts load. */
  measure: Measure | undefined;
  onError: (message: string | undefined) => void;
}) {
  const { state, dispatch } = useArmyList();
  const confirm = useConfirm();
  const { list } = state;
  const [printSize, setPrintSize] = useState<PrintSize>('large');
  const [printing, setPrinting] = useState(false);
  const total = bpTotal(list);
  const over = isOverBpLimit(list);
  const canPrint = measure !== undefined && hasFieldedCopies(list);

  async function downloadPdf() {
    if (!measure) return;
    const markedProfiles = fieldedWithIssues(list);
    if (markedProfiles.length > 0) {
      const confirmed = await confirm({
        question: 'Print cards marked ILLEGAL?',
        detail: illegalPrintDetail(markedProfiles),
        confirmLabel: 'Download anyway',
      });
      if (!confirmed) return;
    }
    setPrinting(true);
    onError(undefined);
    try {
      // Loaded on demand: jsPDF and svg2pdf are most of the bundle.
      const { exportArmyListPdf } = await import('../pdf/exportPdf');
      const doc = await exportArmyListPdf(list, printSize, measure);
      doc.save(cardsPdfFilename(list.name, printSize));
    } catch (reason) {
      onError(`Couldn't build the PDF: ${String(reason)}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    /* The landmark is the app bar in App.tsx; this is just its contents. */
    <div className={styles.header}>
      {/* No visible label: a text field atop the Army List reads as its name (ADR 0008). */}
      <input
        className={styles.name}
        aria-label="Army List name"
        placeholder="Army List name"
        value={list.name}
        onChange={(event) => dispatch({ type: 'renameList', name: event.target.value })}
      />
      <div className={styles.bp}>
        <span className={over ? `${styles.total} ${styles.over}` : styles.total}>
          Bp <output>{total}</output> /
        </span>
        <NumberField
          className={styles.limit}
          label="Bp Limit"
          labelHidden
          value={list.bpLimit}
          range={bpLimitRange}
          onChange={(bpLimit) => dispatch({ type: 'setBpLimit', bpLimit })}
        />
        {over && (
          <p role="status" className={styles.warning}>
            Over the Bp Limit by {total - list.bpLimit}
          </p>
        )}
      </div>
      <div className={styles.printControls}>
        <label className={styles.printSize}>
          <span>Print size</span>
          <select
            value={printSize}
            onChange={(event) => setPrintSize(event.target.value as PrintSize)}
          >
            {printSizes.map((size) => (
              <option key={size} value={size}>
                {printSizeLabels[size]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.download}
          onClick={downloadPdf}
          disabled={!canPrint || printing}
        >
          {printing ? 'Building PDF…' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}

/** Says which Unit Profiles' cards will print marked illegal, and why. */
function illegalPrintDetail(profiles: readonly { name: string }[]): string {
  const names = profiles.map(({ name }) => name);
  const last = names.pop();
  const subject = names.length > 0 ? `${names.join(', ')} and ${last} have` : `${last} has`;
  const cards = names.length > 0 ? 'their cards print' : 'its card prints';
  return `${subject} Issues, so ${cards} marked ILLEGAL.`;
}
