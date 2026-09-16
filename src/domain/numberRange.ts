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

/** The typed-in text as a number, or undefined when it isn't one. */
export function readNumber(text: string): number | undefined {
  const trimmed = text.trim();
  const value = trimmed === '' ? NaN : Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * The typed-in value rounded to the step and pulled into range, for when editing ends. Text that
 * isn't a number gives back `current`.
 */
export function clampToRange(text: string, range: NumberRange, current: number): number {
  const value = readNumber(text);
  if (value === undefined) return current;
  return pullIntoRange(Math.round(value / range.step) * range.step, range);
}

/**
 * One step up (`1`) or down (`-1`) from `value`, stopping at the ends of the range. A value off the
 * step moves to the next step in that direction, so 55 goes up to 60 and down to 50.
 */
export function stepInRange(value: number, range: NumberRange, direction: 1 | -1): number {
  const steps = value / range.step;
  const next = direction === 1 ? Math.floor(steps) + 1 : Math.ceil(steps) - 1;
  return pullIntoRange(next * range.step, range);
}

function pullIntoRange(value: number, range: NumberRange): number {
  return Math.min(range.max, Math.max(range.min, value));
}
