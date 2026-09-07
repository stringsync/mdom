import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// Eb major (3 flats), declared once in m1. m2 never restates it.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><key><fifths>-3</fifths><mode>major</mode></key></attributes>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('Key', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;

  it('reads fifths and mode, and derives the tonic', () => {
    const key = part.getMeasure('1')!.getKey()!;
    expect(key.fifths).toBe(-3);
    expect(key.mode).toBe('major');
    expect(key.rootNote).toBe('Eb');
  });

  it('carries the key into a later measure that never declares one', () => {
    // m2 has no <key> of its own; key() returns the one still in effect, so the
    // caller never walks backwards through earlier measures itself.
    const key = part.getMeasure('2')!.getKey()!;
    expect(key.fifths).toBe(-3);
    expect(key.rootNote).toBe('Eb');
  });
});
