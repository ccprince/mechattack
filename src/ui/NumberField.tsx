import { useId, useState } from 'react';
import { clampToRange, parseInRange, stepInRange, type NumberRange } from '../domain/numberRange';
import { MinusIcon, PlusIcon } from './icons';
import styles from './NumberField.module.css';

/**
 * A typed-in whole number kept in range. Values in range apply as they're typed; anything else is
 * held as a draft and settled into range when the field loses focus. Its own − and + buttons step
 * it, since not every browser draws a spinner on a number input (mobile Chrome doesn't).
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
  const id = useId();
  const [draft, setDraft] = useState<string>();
  const settled = draft === undefined ? value : clampToRange(draft, range, value);

  function edit(text: string) {
    setDraft(text);
    const parsed = parseInRange(text, range);
    if (parsed !== undefined && parsed !== value) onChange(parsed);
  }

  function settle() {
    if (draft === undefined) return;
    if (settled !== value) onChange(settled);
    setDraft(undefined);
  }

  function step(direction: 1 | -1) {
    const stepped = stepInRange(settled, range, direction);
    if (stepped !== value) onChange(stepped);
    setDraft(undefined);
  }

  return (
    // The label names the input by id: the buttons inside it are labelable too, and name themselves.
    <label className={className} htmlFor={id}>
      {!labelHidden && <span>{label}</span>}
      <span className={styles.control}>
        {/* Out of the tab order: the input's own arrow keys step it from the keyboard. */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Decrease ${label}`}
          disabled={settled <= range.min}
          onClick={() => step(-1)}
        >
          <MinusIcon />
        </button>
        <input
          id={id}
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
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Increase ${label}`}
          disabled={settled >= range.max}
          onClick={() => step(1)}
        >
          <PlusIcon />
        </button>
      </span>
    </label>
  );
}
