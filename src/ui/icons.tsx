/*
 * The Unit Profile list's icons, drawn inline rather than pulled from a package: four shapes aren't
 * worth a dependency. Each is a 16 box stroked in `currentColor`, so it follows the ink in both
 * colour schemes, and is hidden from screen readers — the button around it carries the name.
 */

const iconAttributes = {
  viewBox: '0 0 16 16',
  width: 16,
  height: 16,
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
