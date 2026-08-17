import { describe, expect, it } from 'bun:test';
import { MDOMParser } from '../index';

// The interleaved sibling runs MusicXML reads positionally, all in one file:
// a non-traditional key (<key-step>/<key-alter>/<key-accidental>, indexed by
// <key-octave number>), an elided lyric, a tuplet marker with printed numbers
// that differ from the <time-modification> ratio, and a mid-measure barline that
// only the backup/forward fold can place.
const SAMPLE = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions>
    <key>
      <key-step>F</key-step><key-alter>1</key-alter>
      <key-step>B</key-step><key-alter>-1</key-alter><key-accidental>flat</key-accidental>
      <key-step>E</key-step><key-alter>0</key-alter>
      <key-octave number="2">3</key-octave>
    </key>
  </attributes>
  <note>
    <pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type>
    <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
    <lyric number="1"><text>de</text><elision>_</elision><text>o</text><elision/><text>ra</text></lyric>
    <notations>
      <tuplet type="start" number="1" placement="above" bracket="no" show-number="both" show-type="actual">
        <tuplet-actual><tuplet-number>7</tuplet-number><tuplet-type>eighth</tuplet-type><tuplet-dot/></tuplet-actual>
        <tuplet-normal><tuplet-number>5</tuplet-number><tuplet-type>eighth</tuplet-type></tuplet-normal>
      </tuplet>
    </notations>
  </note>
  <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type>
    <notations><tuplet type="stop" number="1"/></notations></note>
  <barline location="middle"><bar-style>dotted</bar-style></barline>
  <note><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><type>half</type></note>
</measure></part></score-partwise>`;

const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;

describe('the sibling runs MusicXML reads positionally', () => {
  const lyric = measure.notes[0]!.lyrics[0]!;
  const start = measure.notes[0]!.tuplets[0]!;
  const stop = measure.notes[1]!.tuplets[0]!;

  it('pairs the nth step with the nth alter, accidental and key-octave', () => {
    expect(measure.getKey()!.alterations).toEqual([
      { step: 'F', alter: 1, accidental: null, octave: null },
      { step: 'B', alter: -1, accidental: 'flat', octave: 3 },
      { step: 'E', alter: 0, accidental: null, octave: null },
    ]);
  });

  it('keeps the order given, not circle-of-fifths order', () => {
    expect(measure.getKey()!.alterations.map((alteration) => alteration.step)).toEqual(['F', 'B', 'E']);
    expect(measure.getKey()!.fifths).toBeNull(); // no <fifths>: this is the custom form
  });

  it('keeps the lyric elision runs and their separators, which syllable joins away', () => {
    expect(lyric.runs).toEqual([
      { kind: 'text', text: 'de' },
      { kind: 'elision', text: '_' },
      { kind: 'text', text: 'o' },
      { kind: 'elision', text: '' }, // empty: the symbol is the renderer's pick
      { kind: 'text', text: 'ra' },
    ]);
    expect(lyric.syllable).toBe('deora');
  });

  it('reads the tuplet display attributes, keeping unstated as null', () => {
    expect(start.placement).toBe('above');
    expect(start.bracket).toBe(false);
    expect(start.showNumber).toBe('both');
    expect(start.showType).toBe('actual');
    expect(stop.bracket).toBeNull(); // unstated: the renderer's own rule applies
    expect(stop.showNumber).toBeNull();
  });

  it('reads the printed numbers separately from <time-modification>', () => {
    expect(start.actual).toEqual({ number: 7, type: 'eighth', dots: 1 });
    expect(start.normal).toEqual({ number: 5, type: 'eighth', dots: 0 });
    expect(measure.notes[0]!.timeModification).toEqual({ actual: 3, normal: 2 });
    expect(stop.actual).toBeNull(); // fall back to timeModification
  });

  it("reaches the tuplet's part without touching .closest", () => {
    expect(start.part.id).toBe('P1');
  });

  it('places a middle barline on the beat the fold reaches', () => {
    expect(measure.barlines[0]!.location).toBe('middle');
    expect(measure.barlines[0]!.measureBeat).toBe(2); // after two quarter notes
  });
});
