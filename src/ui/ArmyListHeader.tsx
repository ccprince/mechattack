import { useRef, useState, type ChangeEvent } from 'react';
import type { Measure } from '../cards/fitText';
import { printSizeLabels, printSizes, type PrintSize } from '../cards/pageLayout';
import {
  bpLimitRange,
  bpTotal,
  fieldedWithIssues,
  hasFieldedCopies,
  isOverBpLimit,
} from '../domain/armyList';
import { addSavedArmyList } from '../domain/armyListStorage';
import { armyListFilename, parseArmyList, serializeArmyList } from '../domain/armyListDocument';
import styles from './ArmyListHeader.module.css';
import { useArmyList } from './ArmyListContext';
import { downloadJson } from './downloadJson';
import { NumberField } from './NumberField';
import { SavedArmyListPicker } from './SavedArmyListPicker';

export function ArmyListHeader({
  measure,
  onError,
}: {
  /** Measures card text; undefined until the card fonts load. */
  measure: Measure | undefined;
  onError: (message: string | undefined) => void;
}) {
  const { state, dispatch, switchList } = useArmyList();
  const { list } = state;
  const [printSize, setPrintSize] = useState<PrintSize>('large');
  const [printing, setPrinting] = useState(false);
  const total = bpTotal(list);
  const over = isOverBpLimit(list);
  const canPrint = measure !== undefined && hasFieldedCopies(list);
  const fileInput = useRef<HTMLInputElement>(null);

  async function downloadPdf() {
    if (!measure) return;
    const markedProfiles = fieldedWithIssues(list);
    if (markedProfiles.length > 0 && !window.confirm(illegalPrintQuestion(markedProfiles))) return;
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

  function exportJson() {
    downloadJson(serializeArmyList(list), armyListFilename(list.name));
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
    switchList((store) => addSavedArmyList(store, imported));
  }

  return (
    /* The landmark is the app bar in App.tsx; this is just its contents. */
    <div className={styles.header}>
      <SavedArmyListPicker />
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
      <div className={styles.fileControls}>
        <button type="button" onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Import JSON
        </button>
        {/* Opened by Import JSON: a bare file input can't be labelled or styled like the buttons. */}
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={importJson}
        />
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
    </div>
  );
}

/** Asks whether to print cards that will be marked illegal, naming their Unit Profiles. */
function illegalPrintQuestion(profiles: readonly { name: string }[]): string {
  const names = profiles.map(({ name }) => name);
  const last = names.pop();
  const subject = names.length > 0 ? `${names.join(', ')} and ${last} have` : `${last} has`;
  const cards = names.length > 0 ? 'their cards print' : 'its card prints';
  return `${subject} Issues, so ${cards} marked ILLEGAL. Download the PDF anyway?`;
}
