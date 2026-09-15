import { useEffect, useMemo, useState } from 'react';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import { buildMechCardSvg } from '../cards/mechCard';
import styles from './App.module.css';
import { ArmyListHeader } from './ArmyListHeader';
import { ArmyListProvider, useSelectedUnitProfile } from './ArmyListContext';
import { UnitProfileEditor } from './UnitProfileEditor';
import { UnitProfileList } from './UnitProfileList';

export function App() {
  return (
    <ArmyListProvider>
      <ArmyListEditor />
    </ArmyListProvider>
  );
}

function ArmyListEditor() {
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
  // Rebuilt on every edit: the card is never patched in place (ADR 0002).
  const card = useMemo(
    () => (measure && selected ? buildMechCardSvg(selected, measure) : undefined),
    [measure, selected],
  );

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Mech Attack List Builder</h1>
      <ArmyListHeader card={card} onError={setError} />
      {error && <p role="alert">{error}</p>}
      <div className={styles.columns}>
        <UnitProfileList />
        {selected ? (
          <UnitProfileEditor key={selected.id} profile={selected} card={card} />
        ) : (
          <p className={styles.empty}>Add a Mech to start building the Army List.</p>
        )}
      </div>
    </main>
  );
}
