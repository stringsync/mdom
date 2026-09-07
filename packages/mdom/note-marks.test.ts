import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A note carrying the ornaments and technical marks mdom used to leave on the
// generic axes. The <accidental-mark>s matter positionally: each qualifies the
// ornament it FOLLOWS, and a turn's pair reads one above and one below.
const MARKED = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note>
    <pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>
    <notations>
      <ornaments>
        <turn placement="above"/>
        <accidental-mark placement="above">sharp</accidental-mark>
        <accidental-mark placement="below">flat</accidental-mark>
        <tremolo type="start">3</tremolo>
        <mordent/>
      </ornaments>
      <technical>
        <fingering alternate="yes" substitution="yes" placement="above">2</fingering>
        <up-bow/>
        <pluck>m</pluck>
        <string>3</string>
        <fret>5</fret>
      </technical>
      <non-arpeggiate type="bottom" number="1"/>
    </notations>
  </note>
  <note><chord/><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><non-arpeggiate type="top" number="1"/></notations></note>
  <note><unpitched><display-step>E</display-step><display-octave>4</display-octave></unpitched>
    <duration>4</duration><voice>1</voice></note>
  <note><rest><display-step>F</display-step><display-octave>5</display-octave></rest>
    <duration>4</duration><voice>1</voice></note>
</measure></part></score-partwise>`;

describe('note — ornaments and technicals, in document order', () => {
  const measure = new MDOMParser().parseFromString(MARKED).score.getPart('P1')!.getMeasure('1')!;
  const [ornamented, chordMember, drum, rest] = measure.notes;

  it('keeps the ornaments in order so each accidental mark stays with its ornament', () => {
    expect(ornamented!.ornaments.map((ornament) => ornament.ornamentType)).toEqual([
      'turn',
      'accidental-mark',
      'accidental-mark',
      'tremolo',
      'mordent',
    ]);
  });

  it('reads an accidental mark glyph and its placement, null on other ornaments', () => {
    const [turn, above, below] = ornamented!.ornaments;
    expect(turn!.placement).toBe('above');
    expect(turn!.accidentalMark).toBeNull();
    expect(above!.accidentalMark).toBe('sharp');
    expect(above!.placement).toBe('above');
    expect(below!.accidentalMark).toBe('flat');
    expect(below!.placement).toBe('below');
  });

  it('reads a tremolo slash count and type, null on other ornaments', () => {
    const tremolo = ornamented!.ornaments[3]!;
    expect(tremolo.tremoloMarks).toBe(3);
    expect(tremolo.tremoloType).toBe('start');
    expect(ornamented!.ornaments[4]!.tremoloMarks).toBeNull();
    expect(ornamented!.ornaments[4]!.tremoloType).toBeNull();
  });

  it('collects every technical mark, with its text and flags', () => {
    expect(ornamented!.technicals.map((mark) => mark.technicalType)).toEqual([
      'fingering',
      'up-bow',
      'pluck',
      'string',
      'fret',
    ]);
    const fingering = ornamented!.technicals[0]!;
    expect(fingering.text).toBe('2');
    expect(fingering.alternate).toBe(true);
    expect(fingering.substitution).toBe(true);
    expect(fingering.placement).toBe('above');
    expect(ornamented!.technicals[1]!.text).toBeNull();
    expect(ornamented!.technicals[1]!.alternate).toBe(false);
  });

  it('keeps the common tablature reads working alongside', () => {
    expect(ornamented!.string).toBe(3);
    expect(ornamented!.fret).toBe(5);
    expect(drum!.ornaments).toEqual([]);
    expect(drum!.technicals).toEqual([]);
  });

  it('reads the non-arpeggiate bracket ends', () => {
    expect(ornamented!.nonArpeggiate).toBe('bottom');
    expect(chordMember!.nonArpeggiate).toBe('top');
    expect(drum!.nonArpeggiate).toBeNull();
  });

  it('reads the display position of an unpitched note and of a pinned rest', () => {
    expect(drum!.unpitched).toEqual({ step: 'E', octave: 4 });
    expect(drum!.restPosition).toBeNull();
    expect(rest!.restPosition).toEqual({ step: 'F', octave: 5 });
    expect(rest!.unpitched).toBeNull();
    expect(ornamented!.unpitched).toBeNull();
  });
});
