import { useState } from 'react';
import type { Measure } from '../cards/fitText';
import { printSizeLabels, printSizes, type PrintSize } from '../cards/pageLayout';
import { bpLimitRange, bpTotal, hasFieldedCopies, isOverBpLimit } from '../domain/armyList';
import styles from './ArmyListHeader.module.css';
import { useArmyList } from './ArmyListContext';
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
  const { list } = state;
  const [printSize, setPrintSize] = useState<PrintSize>('large');
  const [printing, setPrinting] = useState(false);
  const total = bpTotal(list);
  const over = isOverBpLimit(list);
  const canPrint = measure !== undefined && hasFieldedCopies(list);

  async function downloadPdf() {
    if (!measure) return;
    setPrinting(true);
    onError(undefined);
    try {
      // Loaded on demand: jsPDF and svg2pdf are most of the bundle.
      const { exportArmyListPdf } = await import('../pdf/exportPdf');
      const doc = await exportArmyListPdf(list, printSize, measure);
      doc.save('mech-attack-cards.pdf');
    } catch (reason) {
      onError(`Couldn't build the PDF: ${String(reason)}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <header className={styles.header}>
      <label className={styles.name}>
        <span>Army List name</span>
        <input
          value={list.name}
          onChange={(event) => dispatch({ type: 'renameList', name: event.target.value })}
        />
      </label>
      <div className={styles.bp}>
        <span className={over ? styles.over : undefined}>
          Bp <output>{total}</output> /
        </span>
        <NumberField
          className={styles.limit}
          label="Bp Limit"
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
        <button type="button" onClick={downloadPdf} disabled={!canPrint || printing}>
          {printing ? 'Building PDF…' : 'Download PDF'}
        </button>
      </div>
    </header>
  );
}
