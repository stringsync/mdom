import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A trill's <wavy-line> spanning two notes: a `start` on the first note and a
// `stop` on a later one. Each <wavy-line> lives two levels deep, in
// <notations><ornaments>, yet pairs start/stop exactly like every other spanner.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
        <notations><ornaments><wavy-line type="start" number="1"/></ornaments></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration>
        <notations><ornaments><wavy-line type="stop" number="1"/></ornaments></notations></note>
    </measure>
  </part>
</score-partwise>`;

describe('wavy-line — a trill spanner nested in <notations><ornaments>', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;

  it('reads type and number, and resolves its note through the ornaments nesting', () => {
    // .note climbs out of <ornaments> via closest(Note) to the owning C note.
    const start = part.measure('1')!.notes[0]!.wavyLines[0]!;
    expect(start.wavyLineType).toBe('start');
    expect(start.number).toBe('1');
    expect(start.note.pitch?.step).toBe('C');
  });

  it('pairs the start with the matching stop two notes later via partner()', () => {
    const start = part.measure('1')!.notes[0]!.wavyLines[0]!;
    const stop = start.partner()!;
    expect(stop.wavyLineType).toBe('stop');
    expect(stop.note.pitch?.step).toBe('E'); // the third note carries the stop
  });

  it('walks the whole span with members(), start..stop inclusive', () => {
    const start = part.measure('1')!.notes[0]!.wavyLines[0]!;
    const types = start.members().map((wavyLine) => wavyLine.wavyLineType);
    expect(types).toEqual(['start', 'stop']);
  });
});
