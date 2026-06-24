import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

const SAMPLE = `<score-partwise>
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note>
        <pitch>
          <step>C</step>
          <alter>1</alter>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <rest/>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe('Note', () => {
  const parser = new MDOMParser();
  const notes = parser.parseFromString(SAMPLE).score?.getPart('P1')?.getMeasure('1')?.notes ?? [];

  it('lists every note in the measure', () => {
    expect(notes.length).toBe(2);
  });

  it('reads a pitched note', () => {
    const note = notes[0];
    expect(note?.isRest).toBe(false);
    expect(note?.pitch?.step).toBe('C');
    expect(note?.pitch?.alter).toBe(1);
    expect(note?.pitch?.octave).toBe(4);
    expect(note?.duration).toBe(4);
    expect(note?.type).toBe('quarter');
  });

  it('reads a rest as a note with no pitch', () => {
    const rest = notes[1];
    expect(rest?.isRest).toBe(true);
    expect(rest?.pitch).toBeNull();
  });

  it('reads articulations, stem, and time-modification (absent → [] / null)', () => {
    const marked = `<score-partwise><part id="P1"><measure number="1">
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>eighth</type>
        <stem>up</stem>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><articulations><staccato/><accent/></articulations></notations>
      </note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure></part></score-partwise>`;
    const [fancy, plain] = new MDOMParser().parseFromString(marked).score.getPart('P1')!.getMeasure('1')!.notes;
    expect(fancy!.articulations).toEqual(['staccato', 'accent']);
    expect(fancy!.stem).toBe('up');
    expect(fancy!.timeModification).toEqual({ actual: 3, normal: 2 });
    expect(plain!.articulations).toEqual([]);
    expect(plain!.stem).toBeNull();
    const noneStem = `<score-partwise><part id="P1"><measure number="1">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><stem>none</stem></note>
    </measure></part></score-partwise>`;
    expect(new MDOMParser().parseFromString(noneStem).score.getPart('P1')!.getMeasure('1')!.notes[0]!.stem).toBe(
      'none'
    );
    expect(plain!.timeModification).toBeNull();
  });

  it('counts augmentation dots, 0 when none', () => {
    const dotted = `<score-partwise><part id="P1"><measure number="1">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>7</duration><type>quarter</type><dot/><dot/></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure></part></score-partwise>`;
    const [doubleDotted, plain] = new MDOMParser().parseFromString(dotted).score.getPart('P1')!.getMeasure('1')!.notes;
    expect(doubleDotted!.dots).toBe(2);
    expect(plain!.dots).toBe(0);
  });
});
