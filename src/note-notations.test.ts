import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

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
    expect(fancy!.notehead).toEqual({ value: 'x', parentheses: true, filled: null, color: null });
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
