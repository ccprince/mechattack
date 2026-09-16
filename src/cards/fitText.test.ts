import { describe, expect, it } from 'vitest';
import { fitLine, fitOrWrap, wrapLines, type Measure } from './fitText';

// Every character is half the font size wide.
const measure: Measure = (text, fontSize) => text.length * fontSize * 0.5;

describe('fitLine', () => {
  it('keeps text that fits at the requested size', () => {
    expect(fitLine('Ironclad', 100, 12, measure)).toEqual({ text: 'Ironclad', fontSize: 12 });
  });

  it('shrinks text until it fits', () => {
    // 20 chars: 12px → 120 wide; 10px → 100 wide.
    expect(fitLine('abcdefghijklmnopqrst', 100, 12, measure)).toEqual({
      text: 'abcdefghijklmnopqrst',
      fontSize: 10,
    });
  });

  it('truncates with an ellipsis once the minimum size is reached', () => {
    // At 8px each char is 4 wide, so 25 chars fit in 100.
    const fitted = fitLine('a'.repeat(40), 100, 12, measure);
    expect(fitted.fontSize).toBe(8);
    expect(fitted.text).toBe(`${'a'.repeat(24)}…`);
  });
});

describe('fitOrWrap', () => {
  it('keeps a name that fits on one line at full size', () => {
    // 16 chars: 14px → 112 wide.
    expect(fitOrWrap('Turret: Lt Laser', 204, 14, 12, 2, measure)).toEqual({
      lines: ['Turret: Lt Laser'],
      fontSize: 14,
    });
  });

  it('wraps a name too wide for one line, at the smaller wrapped size', () => {
    // 36 chars: 14px → 252 wide, over 204; at 12px each char is 6 wide, so 34 fit.
    expect(fitOrWrap('Static: Remote Guided Missile System', 204, 14, 12, 2, measure)).toEqual({
      lines: ['Static: Remote Guided Missile', 'System'],
      fontSize: 12,
    });
  });

  it('truncates the last line when the name needs more lines than it has', () => {
    const { lines, fontSize } = fitOrWrap('word '.repeat(30).trim(), 60, 13, 13, 2, measure);
    expect(fontSize).toBe(13);
    expect(lines).toHaveLength(2);
    expect(lines.at(-1)).toMatch(/…$/);
  });
});

describe('wrapLines', () => {
  // At 10px each char is 5 wide, so 20 chars fit in 100.
  it('wraps words onto lines that fit', () => {
    expect(wrapLines('Jump jets add two to Mv when moving', 100, 10, 5, measure)).toEqual([
      'Jump jets add two to',
      'Mv when moving',
    ]);
  });

  it('starts a new line at each newline', () => {
    expect(wrapLines('Jump jets\nECM suite', 100, 10, 5, measure)).toEqual([
      'Jump jets',
      'ECM suite',
    ]);
  });

  it('ends the last allowed line with an ellipsis when text overflows', () => {
    expect(wrapLines('one\ntwo\nthree', 100, 10, 2, measure)).toEqual(['one', 'two…']);
  });

  it('truncates a single word wider than the box', () => {
    expect(wrapLines('x'.repeat(30), 100, 10, 2, measure)).toEqual([`${'x'.repeat(19)}…`]);
  });
});
