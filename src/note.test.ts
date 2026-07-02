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

// One measure of notes each carrying a different notation/technical marking, so
// every reader getter has a positive and (via the plain trailing note) a negative case.
const MARKED = `<score-partwise><part id="P1"><measure number="1">
  <note>
    <pitch><step>E</step><octave>4</octave></pitch><duration>256</duration><type>quarter</type>
    <notehead parentheses="yes">x</notehead>
    <notations>
      <fermata type="inverted"/>
      <arpeggiate direction="down"/>
      <technical>
        <harmonic/>
        <bend><bend-alter>2</bend-alter><release/></bend>
        <other-technical>P.M.</other-technical>
        <other-technical>let ring</other-technical>
      </technical>
    </notations>
  </note>
  <note>
    <grace slash="yes"/><pitch><step>F</step><octave>4</octave></pitch><type>eighth</type>
    <notations><fermata/><arpeggiate/></notations>
  </note>
  <note><pitch><step>G</step><octave>4</octave></pitch><duration>256</duration><type>quarter</type><grace/></note>
</measure></part></score-partwise>`;

describe('note — notation and technical reader getters', () => {
  const [fancy, grace, plain] = new MDOMParser().parseFromString(MARKED).score.getPart('P1')!.getMeasure('1')!.notes;

  it('reads the notehead glyph and its ghost-note parentheses, null when absent', () => {
    expect(fancy!.notehead).toEqual({ value: 'x', parentheses: true });
    expect(plain!.notehead).toBeNull();
  });

  it('reads the fermata type, defaulting a bare <fermata> to upright, null when absent', () => {
    expect(fancy!.fermata).toBe('inverted');
    expect(grace!.fermata).toBe('upright'); // present without a type
    expect(plain!.fermata).toBeNull();
  });

  it('keeps a directed roll distinct from an undirected one, both distinct from none', () => {
    expect(fancy!.arpeggiate).toEqual({ direction: 'down' });
    expect(grace!.arpeggiate).toEqual({ direction: null }); // present, no direction
    expect(plain!.arpeggiate).toBeNull();
  });

  it('flags a slashed grace note (acciaccatura) apart from a plain grace or non-grace', () => {
    expect(grace!.graceSlash).toBe(true);
    expect(plain!.graceSlash).toBe(false); // a plain <grace/>
    expect(fancy!.graceSlash).toBe(false); // not a grace note at all
  });

  it('detects a harmonic and reads a bend with its release, null when absent', () => {
    expect(fancy!.isHarmonic).toBe(true);
    expect(fancy!.bend).toEqual({ semitones: 2, release: true });
    expect(plain!.isHarmonic).toBe(false);
    expect(plain!.bend).toBeNull();
  });

  it('lists every <other-technical> free-text child in document order', () => {
    expect(fancy!.otherTechnical).toEqual(['P.M.', 'let ring']);
    expect(plain!.otherTechnical).toEqual([]);
  });
});
