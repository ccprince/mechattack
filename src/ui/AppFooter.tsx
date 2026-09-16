import styles from './AppFooter.module.css';

const repoUrl = 'https://github.com/ccprince/mechattack';

/** Identifies the build for a player reporting a problem; 'dev' outside a production build. */
const build = import.meta.env.VITE_COMMIT_SHA ?? 'dev';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.build}>
        build <span>{build}</span>
      </p>
      <p>Army Lists are saved in this browser only.</p>
      <p>
        <a href={repoUrl}>ccprince/mechattack</a>
      </p>
    </footer>
  );
}
