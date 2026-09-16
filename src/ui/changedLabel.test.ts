import { describe, expect, it } from 'vitest';
import { changedLabel } from './changedLabel';

const now = new Date('2026-09-16T12:00:00.000Z');
const label = (changed: string) => changedLabel(changed, now, 'en-US');

describe('changedLabel', () => {
  it('says just now for the last minute, and a clock a little fast', () => {
    expect(label('2026-09-16T11:59:30.000Z')).toBe('just now');
    expect(label('2026-09-16T12:00:05.000Z')).toBe('just now');
  });

  it('counts minutes, hours and days back for the past week', () => {
    expect(label('2026-09-16T11:55:00.000Z')).toBe('5 minutes ago');
    expect(label('2026-09-16T09:00:00.000Z')).toBe('3 hours ago');
    expect(label('2026-09-15T11:00:00.000Z')).toBe('yesterday');
    expect(label('2026-09-10T12:00:00.000Z')).toBe('6 days ago');
  });

  it('gives the date for anything older', () => {
    expect(label('2026-09-01T12:00:00.000Z')).toBe('Sep 1, 2026');
  });
});
