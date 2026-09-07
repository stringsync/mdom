import { describe, expect, it } from 'bun:test';
import { durationDivisions } from './note';

describe('durationDivisions — the write-side duration math', () => {
  it('converts a note type and dots to divisions', () => {
    expect(durationDivisions({ type: 'quarter' }, 256)).toBe(256);
    expect(durationDivisions({ type: 'whole' }, 256)).toBe(1024);
    expect(durationDivisions({ type: 'quarter', dots: 1 }, 256)).toBe(384);
    expect(durationDivisions({ type: 'quarter', dots: 3 }, 256)).toBe(480);
    expect(durationDivisions({ type: '128th' }, 256)).toBe(8);
  });

  it('throws loudly rather than emit a fractional <duration>', () => {
    expect(() => durationDivisions({ type: '128th', dots: 2 }, 4)).toThrow('fractional duration');
  });
});
