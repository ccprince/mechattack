const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

/**
 * When a Saved Army List last changed, as the picker shows it: relative for the past week, a date
 * before that. `locale` is fixed only in tests.
 */
export function changedLabel(changed: string, now: Date, locale?: string): string {
  const then = new Date(changed);
  const ago = now.getTime() - then.getTime();
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (ago < minute) return 'just now';
  if (ago < hour) return relative.format(-Math.floor(ago / minute), 'minute');
  if (ago < day) return relative.format(-Math.floor(ago / hour), 'hour');
  if (ago < 7 * day) return relative.format(-Math.floor(ago / day), 'day');
  return then.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}
