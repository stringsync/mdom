import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A grand staff with a mid-measure clef change on the LOWER staff — written the
// only way MusicXML can write it: upper notes, <backup>, then an <attributes>
// carrying <clef number="2">, then the lower notes. That block belongs at beat 0,
// not at the measure's end, which is exactly what the next note's own
// measureBeat says (it has already rewound the backup). A second block trails the
// last note: that one is the courtesy clef before the barline.
const GRAND_STAFF = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions><staves>2</staves>
    <clef number="1"><sign>G</sign><line>2</line></clef>
    <clef number="2"><sign>F</sign><line>4</line></clef>
  </attributes>
  <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff></note>
  <note><pitch><step>D</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff></note>
  <backup><duration>16</duration></backup>
  <attributes><clef number="2"><sign>C</sign><line>3</line></clef></attributes>
  <note><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration><voice>2</voice><staff>2</staff></note>
  <note><pitch><step>E</step><octave>3</octave></pitch><duration>8</duration><voice>2</voice><staff>2</staff></note>
  <attributes><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
</measure></part></score-partwise>`;

describe('measure — mid-measure clef changes with onsets', () => {
  const measure = new MDOMParser().parseFromString(GRAND_STAFF).score.getPart('P1')!.getMeasure('1')!;

  it('places a change after a <backup> at the beat it sounds, not at the measure end', () => {
    expect(measure.clefChanges('2').map((change) => [change.beat, change.clef.sign])).toEqual([
      [0, 'C'],
      [4, 'F'], // trailing block: the courtesy clef at the measure's end beat
    ]);
  });

  it('excludes the measure own leading <attributes> — that is what getClef reads', () => {
    expect(measure.clefChanges('1')).toEqual([]);
    expect(measure.getClef('1')?.sign).toBe('G');
    expect(measure.getClef('2')?.sign).toBe('F');
  });

  it('reports the clef in effect at the end for the next measure to compare against', () => {
    expect(measure.clefAtEnd('2')?.sign).toBe('F');
    expect(measure.clefAtEnd('1')?.sign).toBe('G'); // never changed: the one it opened with
  });

  it('measures the beat its content runs out to, across voices', () => {
    expect(measure.endBeat).toBe(4);
  });
});
