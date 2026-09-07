import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import type { Part } from './part';

// A two-staff part that declares its signatures in measure 1, changes the lower
// staff's clef in measure 3, and states nothing in measures 2 and 4 — the shape
// every slice and every inserted spacer measure has to cope with.
const SCORE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions><staves>2</staves>
      <key><fifths>2</fifths><mode>major</mode></key>
      <time><beats>3</beats><beat-type>4</beat-type></time>
      <clef number="1"><sign>G</sign><line>2</line></clef>
      <clef number="2"><sign>F</sign><line>4</line></clef>
    </attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="2">
    <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="3">
    <attributes><clef number="2"><sign>C</sign><line>3</line></clef></attributes>
    <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="4">
    <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
</part></score-partwise>`;

function parse(): Part {
  return new MDOMParser().parseFromString(SCORE).score.getPart('P1')!;
}

describe('part — insertMeasureAt + copySignaturesFrom for a spacer measure', () => {
  it('inserts at an index, leaving numbering to the caller', () => {
    const part = parse();
    const gap = part.insertMeasureAt(0);

    expect(part.measures[0]).toBe(gap);
    expect(part.measures).toHaveLength(5);
    expect(gap.getAttribute('number')).toBeNull();
    expect(part.insertMeasureAt(5, { number: 'X' }).number).toBe('X');
  });

  it('gives a gap inserted before every declaration a stave to draw', () => {
    const part = parse();
    const displaced = part.getMeasure('1')!;
    const gap = part.insertMeasureAt(0);
    // Nothing precedes the gap, so carry-forward alone leaves it bare.
    expect(gap.getClef('1')).toBeNull();

    gap.copySignaturesFrom(displaced);
    expect(gap.getClef('1')?.sign).toBe('G');
    expect(gap.getClef('2')?.sign).toBe('F');
    expect(gap.getKey()?.fifths).toBe(2);
    expect(gap.getTime()?.beats).toBe('3');
    expect(gap.staveCount).toBe(2);
  });
});
