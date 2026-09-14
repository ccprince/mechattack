import { useEffect, useRef } from 'react';
import styles from './CardPreview.module.css';

/**
 * Mounts a card SVG built by `src/cards`. The card is never edited here: to change it, build a new
 * one (ADR 0002).
 */
export function CardPreview({ svg, label }: { svg: SVGSVGElement; label: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    host.replaceChildren(svg);
    return () => svg.remove();
  }, [svg]);

  return <div ref={container} className={styles.card} role="img" aria-label={label} />;
}
