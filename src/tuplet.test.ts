import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';

// A triplet of three eighth notes (three notes in the time of two). The bracket
// is marked by <tuplet> in <notations>: type="start" on the first note,
// type="stop" on the third. The 3:2 ratio lives in <time-modification>, which is
// not this node's concern — Tuplet only marks where the group opens and closes.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet type="start" number="1"/></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet type="stop" number="1"/></notations></note>
    </measure>
  </part>
</score-partwise>`;

describe('tuplet — the <tuplet> bracket marking a group start/stop', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;
  const measure = part.measure('1')!;

  it('reads the marker type and number off the opening <tuplet>', () => {
    // The first note opens the group; number defaults to '1' and pairs start↔stop.
    const start = measure.notes[0]!.tuplets[0]!;
    expect(start.tupletType).toBe('start');
    expect(start.number).toBe('1');
  });

  it('exposes the note the bracket hangs off', () => {
    // .note is the <note> the marker lives inside (via <notations>).
    const start = measure.notes[0]!.tuplets[0]!;
    expect(start.note).toBe(measure.notes[0]!);
    expect(start.note.pitch?.step).toBe('C');
  });

  it('pairs start with stop via partner()', () => {
    // partner() walks to the far end: the start finds the stop on the third note.
    const start = measure.notes[0]!.tuplets[0]!;
    const stop = start.partner()!;
    expect(stop.tupletType).toBe('stop');
    expect(stop.note.pitch?.step).toBe('E');
    expect(stop.partner()).toBe(start); // and back again
  });

  it('lists every marker of the span via members()', () => {
    // A tuplet has only the two endpoints (no per-note "continue"), so members()
    // is just [start, stop] — the middle note carries no <tuplet> marker.
    const start = measure.notes[0]!.tuplets[0]!;
    expect(start.members().map((marker) => marker.tupletType)).toEqual(['start', 'stop']);
    expect(measure.notes[1]!.tuplets).toEqual([]);
  });

  it('reports the onset of each endpoint via measureBeat()', () => {
    // Three eighths at divisions=2 sit at beats 0, 0.5, 1.0; measureBeat() defers
    // to the underlying note's onset, so the stop lands one quarter-beat in.
    const start = measure.notes[0]!.tuplets[0]!;
    expect(start.measureBeat()).toBe(0);
    expect(start.partner()!.measureBeat()).toBe(1);
  });
});
