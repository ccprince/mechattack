import { useState } from 'react';
import { bpLimitRange, bpTotal, isOverBpLimit } from '../domain/armyList';
import styles from './ArmyListHeader.module.css';
import { useArmyList } from './ArmyListContext';
import { NumberField } from './NumberField';

export function ArmyListHeader({
  card,
  onError,
}: {
  /** The selected Unit Profile's card; the only one printed for now. */
  card: SVGSVGElement | undefined;
  onError: (message: string | undefined) => void;
}) {
  const { state, dispatch } = useArmyList();
  const { list } = state;
  const [printing, setPrinting] = useState(false);
  const total = bpTotal(list);
  const over = isOverBpLimit(list);

  async function downloadPdf() {
    if (!card) return;
    setPrinting(true);
    onError(undefined);
    try {
      // Loaded on demand: jsPDF and svg2pdf are most of the bundle.
      const { exportCardsPdf } = await import('../pdf/exportPdf');
      const doc = await exportCardsPdf([{ kind: 'Mech', svg: card }], 'large');
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
      <button type="button" onClick={downloadPdf} disabled={!card || printing}>
        {printing ? 'Building PDF…' : 'Download PDF'}
      </button>
    </header>
  );
}
