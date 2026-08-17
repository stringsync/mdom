import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// MusicXML writes color as "#RRGGBB" or "#AARRGGBB" — alpha FIRST, which CSS and
// canvas read as #RRGGBBAA. Handing the eight-digit form straight to a rendering
// context draws the wrong color, so mdom normalizes once. Also here: the
// print-object="no" spacer note and the editorial accidental.
const COLORED = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note color="#80FF0000" print-object="no">
    <pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>eighth</type>
    <accidental editorial="yes" color="#0000FF">sharp</accidental>
    <stem color="#123456">up</stem>
    <notehead filled="no" parentheses="yes" color="#00112233">x</notehead>
    <beam number="1" color="#abcdef">begin</beam>
    <lyric number="1" color="#FFFFFF"><text>la</text></lyric>
  </note>
  <note>
    <pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>eighth</type>
    <notehead filled="yes">normal</notehead>
    <beam number="1">end</beam>
  </note>
  <barline location="right" color="#FF0000"><bar-style>light-heavy</bar-style></barline>
</measure></part></score-partwise>`;

describe('color — normalized once, on the nodes that draw', () => {
  const measure = new MDOMParser().parseFromString(COLORED).score.getPart('P1')!.getMeasure('1')!;
  const [colored, plain] = measure.notes;

  it('drops the leading alpha of the eight-digit form', () => {
    expect(colored!.color).toBe('#FF0000');
    expect(colored!.notehead?.color).toBe('#112233');
  });

  it('passes the six-digit form through untouched', () => {
    expect(colored!.accidental?.color).toBe('#0000FF');
    expect(colored!.stemColor).toBe('#123456');
    expect(colored!.beams[0]!.color).toBe('#abcdef');
    expect(colored!.lyrics[0]!.color).toBe('#FFFFFF');
    expect(measure.barlines[0]!.color).toBe('#FF0000');
  });

  it('is null where the attribute is unset', () => {
    expect(plain!.color).toBeNull();
    expect(plain!.stemColor).toBeNull();
    expect(plain!.beams[0]!.color).toBeNull();
    expect(plain!.notehead?.color).toBeNull();
  });

  it('keeps notehead filled as a tri-state', () => {
    expect(colored!.notehead).toEqual({ value: 'x', parentheses: true, filled: false, color: '#112233' });
    expect(plain!.notehead?.filled).toBe(true);
    expect(measure.notes[1]!.notehead?.parentheses).toBe(false);
  });

  it('reads print-object and the editorial accidental flag', () => {
    expect(colored!.printObject).toBe(false); // holds its tick, draws nothing
    expect(plain!.printObject).toBe(true);
    expect(colored!.accidental?.editorial).toBe(true);
  });
});
