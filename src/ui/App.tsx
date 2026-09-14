import { useEffect, useState } from 'react';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import { buildMechCardSvg } from '../cards/mechCard';
import { sampleMech } from '../domain/mech';
import styles from './App.module.css';
import { CardPreview } from './CardPreview';

export function App() {
  const [card, setCard] = useState<SVGSVGElement>();
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    loadCardFonts()
      .then(() => {
        if (!cancelled) setCard(buildMechCardSvg(sampleMech, createValueMeasure()));
      })
      .catch((reason: unknown) => setError(`Couldn't load the card fonts: ${String(reason)}`));
    return () => {
      cancelled = true;
    };
  }, []);

  async function downloadPdf() {
    if (!card) return;
    setPrinting(true);
    setError(undefined);
    try {
      // Loaded on demand: jsPDF and svg2pdf are most of the bundle.
      const { exportCardsPdf } = await import('../pdf/exportPdf');
      const doc = await exportCardsPdf([{ kind: 'Mech', svg: card }], 'large');
      doc.save('mech-attack-cards.pdf');
    } catch (reason) {
      setError(`Couldn't build the PDF: ${String(reason)}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Mech Attack List Builder</h1>
        <button type="button" onClick={downloadPdf} disabled={!card || printing}>
          {printing ? 'Building PDF…' : 'Download PDF'}
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {card ? <CardPreview svg={card} label={`${sampleMech.name} record card`} /> : <p>Loading…</p>}
    </main>
  );
}
