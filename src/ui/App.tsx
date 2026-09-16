import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import type { KeyValueStore, SavedArmyList } from '../domain/armyListStorage';
import styles from './App.module.css';
import { AppFooter } from './AppFooter';
import { ArmyListHeader } from './ArmyListHeader';
import { ArmyListProvider, useArmyList, useSelectedUnitProfile } from './ArmyListContext';
import { ArmyListsMenu } from './ArmyListsMenu';
import { RecoveryBanner } from './RecoveryBanner';
import { StorageDialog, type StorageDialogHandle } from './StorageDialog';
import { UnitProfileEditor } from './UnitProfileEditor';
import { UnitProfileList } from './UnitProfileList';

export function App({ store, saved: initial }: { store: KeyValueStore; saved: SavedArmyList }) {
  const [saved, setSaved] = useState(initial);
  // Counts switches, so opening a list remounts the editor even when the id stays the same.
  const [opened, setOpened] = useState(0);
  const [backup, setBackup] = useState(initial.backup);

  function switchTo(next: SavedArmyList) {
    // A different backup means the switch found an unreadable list and set it aside.
    if (next.backup !== undefined && next.backup !== saved.backup) setBackup(next.backup);
    setSaved(next);
    setOpened((count) => count + 1);
  }

  return (
    <ArmyListProvider key={opened} store={store} saved={saved} onSwitch={switchTo}>
      <ArmyListEditor
        // Only the Army Lists menu switches lists, so after a switch focus goes back to it.
        focusMenuOnMount={opened > 0}
        banner={
          backup !== undefined && (
            <RecoveryBanner backup={backup} onClose={() => setBackup(undefined)} />
          )
        }
      />
    </ArmyListProvider>
  );
}

function ArmyListEditor({
  banner,
  focusMenuOnMount,
}: {
  banner: ReactNode;
  focusMenuOnMount: boolean;
}) {
  const { autosaveFailed } = useArmyList();
  const selected = useSelectedUnitProfile();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const storageDialog = useRef<StorageDialogHandle>(null);
  const explainStorage = () => storageDialog.current?.show();

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
       * The whole header is sticky: the title row with the Army Lists menu, then the Army-List-level
       * controls (ADR 0008). It's the banner landmark.
       */}
      <header className={styles.bar}>
        <div className={styles.titleBand}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Mech Attack List Builder</h1>
            <ArmyListsMenu
              focusOnMount={focusMenuOnMount}
              onError={setError}
              onExplainStorage={explainStorage}
            />
          </div>
        </div>
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
      <AppFooter onExplainStorage={explainStorage} />
      <StorageDialog ref={storageDialog} />
    </div>
  );
}
