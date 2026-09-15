/** The whole numbers a typed-in stat may take: `min` to `max`, in multiples of `step`. */
export interface NumberRange {
  min: number;
  max: number;
  step: number;
}

/** The typed-in value, or undefined unless it's a whole number in range and on the step. */
export function parseInRange(text: string, range: NumberRange): number | undefined {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value >= range.min && value <= range.max && value % range.step === 0 ? value : undefined;
}

/**
 * The typed-in value rounded to the step and pulled into range, for when editing ends. Text that
 * isn't a number gives back `current`.
 */
export function clampToRange(text: string, range: NumberRange, current: number): number {
  const trimmed = text.trim();
  const value = trimmed === '' ? NaN : Number(trimmed);
  if (!Number.isFinite(value)) return current;
  const stepped = Math.round(value / range.step) * range.step;
  return Math.min(range.max, Math.max(range.min, stepped));
}
