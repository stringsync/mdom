import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Note } from '../index';

// Piano (2 staves), D major (2 sharps), 3/4. m1 declares the full signature;
// m2 has no <attributes>, so every signature query there is carried forward.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>2</fifths><mode>major</mode></key>
        <time symbol="common"><beats>3</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
        <staff-details number="2"><staff-lines>5</staff-lines></staff-details>
      </attributes>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>12</duration><staff>1</staff></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>12</duration><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>12</duration><staff>1</staff></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>12</duration><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

describe('signature in effect — carry-forward queries', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const noteOf = (measure: string, index: number): Note => part.getMeasure(measure)!.notes[index]!;

  it('reads key and time in effect, carried forward into a bare measure', () => {
    const measure2 = part.getMeasure('2')!;
    expect(measure2.getKey()!.fifths).toBe(2);
    expect(measure2.getTime()!.beats).toBe('3');
    expect(measure2.getTime()!.beatType).toBe('4');
    // The same answer is reachable from a note in that measure.
    expect(noteOf('2', 0).key!.fifths).toBe(2);
    expect(noteOf('2', 0).time!.symbol).toBe('common');
  });

  it('selects the clef per staff, from the note or from the measure', () => {
    expect(noteOf('1', 0).clef!.sign).toBe('G'); // staff 1
    expect(noteOf('1', 1).clef!.sign).toBe('F'); // staff 2
    expect(part.getMeasure('1')!.getClef('1')!.sign).toBe('G');
    expect(part.getMeasure('1')!.getClef('2')!.sign).toBe('F');
  });

  it('reports stave count and per-staff line count, carried forward', () => {
    const bassNote = noteOf('2', 1); // staff 2, in the bare measure
    expect(bassNote.staveCount).toBe(2);
    expect(bassNote.staveLines).toBe(5);
  });
});
