import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';

// A beamed group of three eighth notes (C D E), beamed at level 1 with the
// canonical begin/continue/end run. The middle and last notes carry a second
// <beam number="2"> (a sixteenth-level beam) that begins and ends on its own,
// so level-1 and level-2 pairing are independent. The <beam> value is element
// text (begin/continue/end), not an attribute; `number` is the beam level.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
        <beam number="1">begin</beam></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
        <beam number="1">continue</beam><beam number="2">begin</beam></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
        <beam number="1">end</beam><beam number="2">end</beam></note>
    </measure>
  </part>
</score-partwise>`;

describe('beam — begin/continue/end run paired by level', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;
  const measure = part.measure('1')!;
  const [firstNote, secondNote, thirdNote] = measure.notes;

  it('reads the value as element text, the level as the number, and the owning note', () => {
    // The opener of the level-1 beam: text value "begin", level "1", on note C.
    const beam = firstNote!.beams[0]!;
    expect(beam.beamValue).toBe('begin');
    expect(beam.number).toBe('1');
    expect(beam.note.pitch?.step).toBe('C');
  });

  it('pairs begin <-> end across the run, ignoring the continue in between', () => {
    // partner() is the far end: the begin on C finds the end on E, and vice versa.
    const begin = firstNote!.beams[0]!;
    const end = thirdNote!.beams.find((beam) => beam.number === '1')!;
    expect(begin.partner()!.beamValue).toBe('end');
    expect(begin.partner()!.note.pitch?.step).toBe('E');
    expect(end.partner()!.note.pitch?.step).toBe('C');
  });

  it('walks every member of the level-1 span in order, not just the far end', () => {
    // members() returns the whole begin/continue/end run; any member yields it.
    const beam = secondNote!.beams.find((beam) => beam.number === '1')!;
    expect(beam.members().map((beamMember) => beamMember.beamValue)).toEqual(['begin', 'continue', 'end']);
    expect(beam.members().map((beamMember) => beamMember.note.pitch?.step)).toEqual(['C', 'D', 'E']);
  });

  it('pairs each beam level independently — level 2 spans only its own subset', () => {
    // The level-2 beam (number "2") lives on D and E only; it pairs begin->end
    // among level-2 markers without dragging in the level-1 run on C.
    const levelTwoBegin = secondNote!.beams.find((beam) => beam.number === '2')!;
    expect(levelTwoBegin.beamValue).toBe('begin');
    expect(levelTwoBegin.partner()!.note.pitch?.step).toBe('E');
    expect(levelTwoBegin.members().map((beamMember) => beamMember.note.pitch?.step)).toEqual(['D', 'E']);
  });
});
