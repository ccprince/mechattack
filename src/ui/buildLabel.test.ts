import { describe, expect, it } from 'vitest';
import { buildLabel, repoUrl } from './buildLabel';

describe('buildLabel', () => {
  it('names a release build by its version and links its release notes', () => {
    expect(buildLabel('v0.1.0-0-g7854429')).toEqual({
      text: 'v0.1.0 · 7854429',
      href: `${repoUrl}/releases/tag/v0.1.0`,
    });
  });

  it('counts commits past the last release and links what changed since', () => {
    expect(buildLabel('v0.1.0-3-gad66406')).toEqual({
      text: 'v0.1.0+3 · ad66406',
      href: `${repoUrl}/compare/v0.1.0...ad66406`,
    });
  });

  it('keeps a longer SHA when git needed one to be unambiguous', () => {
    expect(buildLabel('v1.2.10-12-gad66406f').text).toBe('v1.2.10+12 · ad66406f');
  });

  it('falls back to the bare SHA without a release tag', () => {
    expect(buildLabel('7854429')).toEqual({ text: '7854429' });
  });

  it('is dev without git', () => {
    expect(buildLabel(undefined)).toEqual({ text: 'dev' });
    expect(buildLabel('')).toEqual({ text: 'dev' });
  });

  it('ignores a tag that is not a version', () => {
    expect(buildLabel('snapshot-2-g7854429')).toEqual({ text: 'dev' });
  });
});
