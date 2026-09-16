import styles from './AppFooter.module.css';
import { buildLabel, repoUrl } from './buildLabel';

/** Identifies the build for a player checking what changed or reporting a problem (ADR 0006). */
const build = buildLabel(import.meta.env.VITE_BUILD);

/** `onExplainStorage` opens the dialog behind the one line about where Army Lists are saved (#50). */
export function AppFooter({ onExplainStorage }: { onExplainStorage: () => void }) {
  return (
    <footer className={styles.footer}>
      <p className={styles.build}>
        build {build.href ? <a href={build.href}>{build.text}</a> : <span>{build.text}</span>}
      </p>
      <p>
        <button type="button" className={styles.link} onClick={onExplainStorage}>
          Army Lists are saved in this browser only.
        </button>
      </p>
      <p>
        <a href={repoUrl}>ccprince/mechattack</a>
      </p>
    </footer>
  );
}
