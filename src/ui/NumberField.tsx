import { useState } from 'react';
import { clampToRange, parseInRange, type NumberRange } from '../domain/numberRange';

/**
 * A typed-in whole number kept in range. Values in range apply as they're typed; anything else is
 * held as a draft and settled into range when the field loses focus.
 */
export function NumberField({
  label,
  value,
  range,
  onChange,
  className,
  labelHidden = false,
}: {
  label: string;
  /** Names the field without showing the label, where what's beside it says what it is. */
  labelHidden?: boolean;
  value: number;
  range: NumberRange;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string>();

  function edit(text: string) {
    setDraft(text);
    const parsed = parseInRange(text, range);
    if (parsed !== undefined && parsed !== value) onChange(parsed);
  }

  function settle() {
    if (draft === undefined) return;
    const settled = clampToRange(draft, range, value);
    if (settled !== value) onChange(settled);
    setDraft(undefined);
  }

  return (
    <label className={className}>
      {!labelHidden && <span>{label}</span>}
      <input
        aria-label={labelHidden ? label : undefined}
        type="number"
        inputMode="numeric"
        min={range.min}
        max={range.max}
        step={range.step}
        value={draft ?? value}
        onChange={(event) => edit(event.target.value)}
        onBlur={settle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') settle();
        }}
      />
    </label>
  );
}
