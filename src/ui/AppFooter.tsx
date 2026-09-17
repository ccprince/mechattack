import styles from './AppFooter.module.css';
import { publisher } from '../domain/publisher';
import { buildLabel, repoUrl } from './buildLabel';
import { GitHubIcon } from './icons';

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
        <a href={repoUrl} className={styles.github}>
          <GitHubIcon />
          GitHub
        </a>
      </p>
      <p className={styles.notice}>
        A fan-made tool for <cite>Mech Attack</cite> by <a href={publisher.url}>{publisher.name}</a>
        . Not official or endorsed.
      </p>
    </footer>
  );
}
