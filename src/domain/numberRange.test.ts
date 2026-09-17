import { describe, expect, it } from 'vitest';
import { clampToRange, parseInRange, stepInRange, type NumberRange } from './numberRange';

const bp: NumberRange = { min: 1, max: 20, step: 1 };
const armor: NumberRange = { min: 0, max: 150, step: 10 };

describe('parseInRange', () => {
  it('reads a typed-in value that is in range', () => {
    expect(parseInRange('15', bp)).toBe(15);
    expect(parseInRange(' 110 ', armor)).toBe(110);
  });

  it('rejects text that is not a whole number', () => {
    expect(parseInRange('', bp)).toBeUndefined();
    expect(parseInRange('abc', bp)).toBeUndefined();
    expect(parseInRange('2.5', bp)).toBeUndefined();
  });

  it('rejects a value outside the range', () => {
    expect(parseInRange('0', bp)).toBeUndefined();
    expect(parseInRange('21', bp)).toBeUndefined();
    expect(parseInRange('160', armor)).toBeUndefined();
  });

  it('rejects a value off the step', () => {
    expect(parseInRange('11', armor)).toBeUndefined();
  });
});

describe('clampToRange', () => {
  it('keeps a value that is already in range', () => {
    expect(clampToRange('7', bp, 3)).toBe(7);
  });

  it('pulls a value back to the nearest end of the range', () => {
    expect(clampToRange('0', bp, 3)).toBe(1);
    expect(clampToRange('-4', bp, 3)).toBe(1);
    expect(clampToRange('99', bp, 3)).toBe(20);
    expect(clampToRange('400', armor, 50)).toBe(150);
  });

  it('rounds to the nearest step', () => {
    expect(clampToRange('114', armor, 50)).toBe(110);
    expect(clampToRange('115', armor, 50)).toBe(120);
    expect(clampToRange('2.6', bp, 3)).toBe(3);
  });

  it('falls back to the current value when the text is not a number', () => {
    expect(clampToRange('', bp, 3)).toBe(3);
    expect(clampToRange('abc', armor, 50)).toBe(50);
  });
});

describe('stepInRange', () => {
  it('moves one step up or down', () => {
    expect(stepInRange(7, bp, 1)).toBe(8);
    expect(stepInRange(7, bp, -1)).toBe(6);
    expect(stepInRange(50, armor, 1)).toBe(60);
    expect(stepInRange(50, armor, -1)).toBe(40);
  });

  it('stops at the ends of the range', () => {
    expect(stepInRange(20, bp, 1)).toBe(20);
    expect(stepInRange(1, bp, -1)).toBe(1);
    expect(stepInRange(150, armor, 1)).toBe(150);
    expect(stepInRange(0, armor, -1)).toBe(0);
  });

  it('moves a value off the step to the next step in that direction', () => {
    expect(stepInRange(55, armor, 1)).toBe(60);
    expect(stepInRange(55, armor, -1)).toBe(50);
    expect(stepInRange(2.5, bp, 1)).toBe(3);
  });

  it('moves by the stride when the range has one, to its next multiple', () => {
    const bpLimit: NumberRange = { min: 0, max: 1000, step: 1, stride: 5 };
    expect(stepInRange(100, bpLimit, 1)).toBe(105);
    expect(stepInRange(100, bpLimit, -1)).toBe(95);
    expect(stepInRange(42, bpLimit, 1)).toBe(45);
    expect(stepInRange(42, bpLimit, -1)).toBe(40);
  });

  it('brings a value outside the range back into it', () => {
    expect(stepInRange(-3, bp, 1)).toBe(1);
    expect(stepInRange(400, armor, -1)).toBe(150);
  });
});
