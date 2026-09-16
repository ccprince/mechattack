export const repoUrl = 'https://github.com/ccprince/mechattack';

export interface BuildLabel {
  /** What the footer shows, e.g. `v0.1.0 · 7854429` or `v0.1.0+3 · 7854429`. */
  text: string;
  /** The release notes, or everything merged since the last release; absent without a release. */
  href?: string;
}

const describePattern = /^(v\d+\.\d+\.\d+)-(\d+)-g([0-9a-f]+)$/;
const shaPattern = /^[0-9a-f]+$/;

/**
 * Names a build from `git describe --tags --long --always --match 'v*'` (ADR 0006): the last release
 * and how many commits past it, plus the short SHA. With no release tag it is the bare SHA, and with
 * no git at all (`npm run dev`, tests) it is `dev`.
 */
export function buildLabel(describe: string | undefined): BuildLabel {
  const match = describe?.match(describePattern);
  if (match) {
    const [, version, ahead, sha] = match;
    return ahead === '0'
      ? { text: `${version} · ${sha}`, href: `${repoUrl}/releases/tag/${version}` }
      : { text: `${version}+${ahead} · ${sha}`, href: `${repoUrl}/compare/${version}...${sha}` };
  }
  if (describe && shaPattern.test(describe)) return { text: describe };
  return { text: 'dev' };
}
