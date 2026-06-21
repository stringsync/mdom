import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import type { Note } from './note';

// Piano (2 staves). Exercises the three things the vexml Signature carry-forward
// existed to handle: clef carried across measures with no <attributes>, per-staff
// selection, and a mid-measure clef change.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><staff>1</staff></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>16</duration><staff>1</staff></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>16</duration><staff>2</staff></note>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><staff>1</staff></note>
      <attributes><clef number="1"><sign>F</sign><line>4</line></clef></attributes>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>8</duration><staff>1</staff></note>
    </measure>
  </part>
</score-partwise>`;

describe('Note.clef — signature carry-forward as a query', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const notesOf = (n: string): Note[] => part.getMeasure(n)!.notes;

  it('reads clefs declared in the same measure, per staff', () => {
    const [s1, s2] = notesOf('1');
    expect(s1!.clef?.sign).toBe('G');
    expect(s2!.clef?.sign).toBe('F');
  });

  it('carries clefs forward into a measure with no <attributes>', () => {
    const [s1, s2] = notesOf('2');
    expect(s1!.clef?.sign).toBe('G');
    expect(s2!.clef?.sign).toBe('F');
  });

  it('honors a mid-measure clef change', () => {
    const [before, after] = notesOf('3');
    expect(before!.clef?.sign).toBe('G'); // before the change
    expect(after!.clef?.sign).toBe('F'); // after the change
  });

  it('carries <divisions> forward too (same backward walk)', () => {
    expect(notesOf('2')[0]!.divisions).toBe(4);
  });

  it('returns null when no clef is in effect', () => {
    const bare = new MDOMParser().parseFromString(
      `<score-partwise><part id="P1"><measure number="1"><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`
    );
    expect(bare.score.getPart('P1')!.getMeasure('1')!.notes[0]!.clef).toBeNull();
  });
});
