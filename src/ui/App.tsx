import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import { hasCard } from '../cards/unitCard';
import type { KeyValueStore, SavedArmyList } from '../domain/armyListStorage';
import styles from './App.module.css';
import { ArmyListHeader } from './ArmyListHeader';
import { ArmyListProvider, useArmyList, useSelectedUnitProfile } from './ArmyListContext';
import { RecoveryBanner } from './RecoveryBanner';
import { UnitProfileEditor } from './UnitProfileEditor';
import { UnitProfileList } from './UnitProfileList';

export function App({ store, saved }: { store: KeyValueStore; saved: SavedArmyList }) {
  const [backup, setBackup] = useState(saved.backup);
  return (
    <ArmyListProvider store={store} savedList={saved.list}>
      <ArmyListEditor
        banner={
          backup !== undefined && (
            <RecoveryBanner backup={backup} onClose={() => setBackup(undefined)} />
          )
        }
      />
    </ArmyListProvider>
  );
}

function ArmyListEditor({ banner }: { banner: ReactNode }) {
  const { autosaveFailed } = useArmyList();
  const selected = useSelectedUnitProfile();
  // The editor previews the card, so only a Unit Profile whose kind has one opens in it.
  const editable = selected && hasCard(selected) ? selected : undefined;
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    loadCardFonts()
      .then(() => {
        if (!cancelled) setFontsLoaded(true);
      })
      .catch((reason: unknown) => setError(`Couldn't load the card fonts: ${String(reason)}`));
    return () => {
      cancelled = true;
    };
  }, []);

  const measure = useMemo(() => (fontsLoaded ? createValueMeasure() : undefined), [fontsLoaded]);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Mech Attack List Builder</h1>
      {banner}
      <ArmyListHeader measure={measure} onError={setError} />
      {autosaveFailed && (
        <p role="status">Couldn't save to this browser, so changes will be lost on reload.</p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className={styles.columns}>
        <UnitProfileList />
        {editable ? (
          <UnitProfileEditor key={editable.id} profile={editable} measure={measure} />
        ) : (
          <p className={styles.empty}>Add a Mech or Vehicle to start building the Army List.</p>
        )}
      </div>
    </main>
  );
}
