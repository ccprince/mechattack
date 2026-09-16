/*
 * The app's icons, drawn inline rather than pulled from a package: a few shapes aren't
 * worth a dependency. Each is a 16 box stroked in `currentColor`, so it follows the ink in both
 * colour schemes, and is hidden from screen readers — the button around it carries the name.
 */

const iconAttributes = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const;

export function PlusIcon() {
  return (
    <svg {...iconAttributes}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg {...iconAttributes}>
      <path d="M3.5 8h9" />
    </svg>
  );
}

/** A sheet lifted off the one behind it. */
export function DuplicateIcon() {
  return (
    <svg {...iconAttributes}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 3.5h-7a1 1 0 0 0-1 1v7" />
    </svg>
  );
}

export function BinIcon() {
  return (
    <svg {...iconAttributes}>
      <path d="M2.5 4.5h11M6.5 4.5V3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1.5" />
      <path d="M4 4.5l.6 8a1 1 0 0 0 1 .95h4.8a1 1 0 0 0 1-.95l.6-8" />
    </svg>
  );
}

/** Three bars: the Army Lists menu. */
export function MenuIcon() {
  return (
    <svg {...iconAttributes}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </svg>
  );
}

/** GitHub's mark (from Octicons), filled rather than stroked, as GitHub draws it. */
export function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden focusable="false">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}
