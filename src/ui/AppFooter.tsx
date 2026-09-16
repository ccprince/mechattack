import styles from './AppFooter.module.css';
import { buildLabel, repoUrl } from './buildLabel';

/** Identifies the build for a player checking what changed or reporting a problem (ADR 0006). */
const build = buildLabel(import.meta.env.VITE_BUILD);

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.build}>
        build {build.href ? <a href={build.href}>{build.text}</a> : <span>{build.text}</span>}
      </p>
      <p>Army Lists are saved in this browser only.</p>
      <p>
        <a href={repoUrl}>ccprince/mechattack</a>
      </p>
    </footer>
  );
}
