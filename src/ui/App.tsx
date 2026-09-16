import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import type { KeyValueStore, SavedArmyList } from '../domain/armyListStorage';
import styles from './App.module.css';
import { AppFooter } from './AppFooter';
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
    <div className={styles.shell}>
      {/*
       * The identity scrolls away; only the bar holding the Army-List-level controls is sticky
       * (ADR 0005). The bar is the banner landmark because it's the part that does work.
       */}
      <div className={styles.identity}>
        <h1 className={styles.title}>Mech Attack List Builder</h1>
      </div>
      <header className={styles.bar}>
        <ArmyListHeader measure={measure} onError={setError} />
      </header>
      <main className={styles.page}>
        {banner}
        {autosaveFailed && (
          <p role="status">Couldn't save to this browser, so changes will be lost on reload.</p>
        )}
        {error && <p role="alert">{error}</p>}
        <div className={styles.columns}>
          <UnitProfileList />
          {selected ? (
            <UnitProfileEditor key={selected.id} profile={selected} measure={measure} />
          ) : (
            <p className={styles.empty}>
              Add a Mech, Vehicle or Troop to start building the Army List.
            </p>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
