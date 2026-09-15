import { z } from 'zod';
import type { NumberRange } from './numberRange';

/** Copies fielded. 100 is far more than any game needs, and keeps printing every copy cheap. */
export const quantityRange: NumberRange = { min: 0, max: 100, step: 1 };

export function inRange({ min, max, step }: NumberRange) {
  return z.number().int().min(min).max(max).multipleOf(step);
}

/** Catalog name (Weapon or Support Equipment), or null when the mount is empty (ADR 0001). */
export const mountedName = z.string().nullable();
