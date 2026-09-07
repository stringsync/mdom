import { describe, expect, it } from 'bun:test';
import { required } from './m-node';

describe('required — the hygienic replacement for a bang', () => {
  it('passes a present value through, including falsy ones', () => {
    expect(required(0, 'a count')).toBe(0);
    expect(required('', 'a label')).toBe('');
    expect(required(false, 'a flag')).toBe(false);
  });

  it('throws a located error for null and undefined', () => {
    expect(() => required(null, '<sign> in <clef>')).toThrow('mdom: missing required <sign> in <clef>');
    expect(() => required(undefined, 'a part')).toThrow('missing required a part');
  });
});
