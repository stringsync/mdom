import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// One part. m1's first note opens a tie (type="start"); m2's note closes it
// (type="stop") under the same number — the canonical cross-measure tie. m3's
// note carries a 'let-ring' tie: an opener with no matching stop, so it pairs to
// nothing. Same start/stop spanner shape as spanners.test.ts; only the marker is
// <tied> instead of <wedge>/<slur>.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration>
        <notations><tied type="start"/></notations></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration>
        <notations><tied type="stop"/></notations></note>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration>
        <notations><tied type="let-ring"/></notations></note>
    </measure>
  </part>
</score-partwise>`;

describe('Tie — the notated <tied>, paired by the shared spanner shape', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;

  it('reads the marker off the note it hangs on', () => {
    // The opener lives on m1's second note (the D), as a <tied> in <notations>.
    const opener = part.measure('1')!.notes[1]!.ties[0]!;
    expect(opener.tieType).toBe('start');
    expect(opener.number).toBe('1'); // omitted number defaults to '1'
    expect(opener.note.pitch?.step).toBe('D'); // the note it hangs off
  });

  it('pairs start↔stop across a barline, both directions', () => {
    const start = part.measure('1')!.notes[1]!.ties[0]!;
    const stop = part.measure('2')!.notes[0]!.ties[0]!;
    expect(start.partner()).toBe(stop); // start → the m2 stop
    expect(stop.partner()).toBe(start); // stop → the m1 start
    expect(stop.tieType).toBe('stop');
  });

  it('returns both ends as members, in document order', () => {
    const start = part.measure('1')!.notes[1]!.ties[0]!;
    const stop = part.measure('2')!.notes[0]!.ties[0]!;
    expect(start.members()).toEqual([start, stop]);
    expect(start.members().map((member) => member.note.pitch?.step)).toEqual(['D', 'D']);
  });

  it('reports each end onset within its measure, in beats', () => {
    const start = part.measure('1')!.notes[1]!.ties[0]!;
    const stop = part.measure('2')!.notes[0]!.ties[0]!;
    expect(start.measureBeat()).toBe(1); // after the m1 quarter note (4/divisions)
    expect(stop.measureBeat()).toBe(0); // first onset in m2
  });

  it('leaves a let-ring tie open — an opener with no partner', () => {
    // 'let-ring' classifies as an opener but has no matching stop, so partner()
    // is null while members() still includes the marker itself.
    const letRing = part.measure('3')!.notes[0]!.ties[0]!;
    expect(letRing.tieType).toBe('let-ring');
    expect(letRing.partner()).toBeNull();
    expect(letRing.members()).toEqual([letRing]);
  });
});
