import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A cross-stave slur, the way Finale exports every other bar of piano writing:
// the slur STARTS in the left hand and STOPS on a right-hand note the exporter
// wrote earlier in the file, because a <backup> puts the lower voice last. In
// document order the stop sits before the start and nothing pairs — the arc runs
// on until measure 2's stop, two bars of ink across the page. In onset order they
// are start (beat 0, lower) then stop (beat 1, upper), which is what sounds.
const CROSS_STAVE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions><staves>2</staves></attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff></note>
    <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff>
      <notations><slur type="stop" number="1"/></notations></note>
    <backup><duration>8</duration></backup>
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><staff>2</staff>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><staff>2</staff></note>
  </measure>
  <measure number="2">
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><staff>1</staff>
      <notations><slur type="stop" number="1"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('slur — paired in onset order, not document order', () => {
  const part = new MDOMParser().parseFromString(CROSS_STAVE).score.getPart('P1')!;
  const [upperC, upperD, lowerC] = part.getMeasure('1')!.notes;
  const nextMeasureNote = part.getMeasure('2')!.notes[0]!;

  it('pairs a slur whose stop was written before its start across a <backup>', () => {
    const start = lowerC!.slurs[0]!;
    const stop = upperD!.slurs[0]!;
    expect(start.slurType).toBe('start');
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
  });

  it('does not run the arc on to a later measure that also stops number 1', () => {
    // The stray stop is orphaned, which is the honest answer — it is not the
    // partner of the left hand's start.
    expect(nextMeasureNote.slurs[0]!.partner).toBeNull();
    expect(upperC!.slurs).toEqual([]);
  });
});
