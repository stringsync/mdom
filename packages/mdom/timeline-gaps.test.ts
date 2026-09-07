import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// <forward> is the other half of the fold and much rarer than <backup>: it skips
// the cursor ahead, leaving a gap no note fills. A measure that ends on a
// <backup> also proves why the content end is a MAXIMUM, not the final cursor.
const GAPS = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  <forward><duration>4</duration></forward>
  <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  <backup><duration>12</duration></backup>
  <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note>
  <backup><duration>4</duration></backup>
</measure></part></score-partwise>`;

describe('timeline — forward gaps and the content end', () => {
  const measure = new MDOMParser().parseFromString(GAPS).score.getPart('P1')!.getMeasure('1')!;

  it('skips the cursor past a <forward>, leaving the gap unfilled', () => {
    expect(measure.notes.map((note) => note.measureBeat)).toEqual([0, 2, 0]);
  });

  it('measures content out to the furthest point reached, not the final cursor', () => {
    // The measure ends on a <backup> that rewinds to beat 0; the content still
    // runs to beat 3, which is the width a renderer has to reserve.
    expect(measure.endBeat).toBe(3);
  });
});
