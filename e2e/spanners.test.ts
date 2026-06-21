import { describe, expect, it } from 'bun:test';
import { MDOMParser } from '../index';

// A tie spanning m1→m2, and a crescendo hairpin spanning m1. The tie hangs off a
// note; the wedge hangs off a <direction>. Both pair start/stop the same way —
// the only difference is the endpoint (`.note` vs `.direction`).
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
        <notations><tied type="start"/></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
        <notations><tied type="stop"/></notations></note>
    </measure>
    <measure number="3">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
        <beam number="1">begin</beam></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
        <beam number="1">continue</beam></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
        <beam number="1">end</beam></note>
    </measure>
  </part>
</score-partwise>`;

describe('spanners — one partner() shape for every relationship', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;

  it('pairs a note-attached tie across measures', () => {
    const start = part.getMeasure('1')!.notes[0]!.ties[0]!;
    expect(start.tieType).toBe('start');
    expect(start.partner!.note!.pitch?.step).toBe('C'); // the m2 note
  });

  it('pairs a direction-attached wedge by beat position, with no note', () => {
    const cresc = part.getMeasure('1')!.directions.flatMap((direction) => direction.wedges)[0]!;
    expect(cresc.wedgeType).toBe('crescendo');
    const stop = cresc.partner!;
    expect(stop.wedgeType).toBe('stop');
    expect(cresc.measureBeat).toBe(0);
    expect(stop.measureBeat).toBe(2); // after two quarter notes
  });

  it('walks every member of a multi-point spanner, not just the far end', () => {
    // A 3-note beam group: begin -> continue -> end. partner() pairs the ends;
    // members() returns the whole run, which a 2-member partner() can't express.
    const beam = part.getMeasure('3')!.notes[0]!.beams[0]!;
    expect(beam.beamValue).toBe('begin');
    expect(beam.partner!.beamValue).toBe('end');
    expect(beam.members.map((beamMember) => beamMember.note!.pitch?.step)).toEqual(['C', 'D', 'E']);
  });
});
