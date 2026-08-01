import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { groupBeamRuns, groupBeams } from './beam';

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
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const measure = part.getMeasure('1')!;
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
    expect(begin.partner!.beamValue).toBe('end');
    expect(begin.partner!.note.pitch?.step).toBe('E');
    expect(end.partner!.note.pitch?.step).toBe('C');
  });

  it('walks every member of the level-1 span in order, not just the far end', () => {
    // members() returns the whole begin/continue/end run; any member yields it.
    const beam = secondNote!.beams.find((beam) => beam.number === '1')!;
    expect(beam.members.map((beamMember) => beamMember.beamValue)).toEqual(['begin', 'continue', 'end']);
    expect(beam.members.map((beamMember) => beamMember.note.pitch?.step)).toEqual(['C', 'D', 'E']);
  });

  it('pairs each beam level independently — level 2 spans only its own subset', () => {
    // The level-2 beam (number "2") lives on D and E only; it pairs begin->end
    // among level-2 markers without dragging in the level-1 run on C.
    const levelTwoBegin = secondNote!.beams.find((beam) => beam.number === '2')!;
    expect(levelTwoBegin.beamValue).toBe('begin');
    expect(levelTwoBegin.partner!.note.pitch?.step).toBe('E');
    expect(levelTwoBegin.members.map((beamMember) => beamMember.note.pitch?.step)).toEqual(['D', 'E']);
  });
});

// Three runs to exercise the grouping fold: a plain begin/continue/end run, an
// unbeamed quarter that must NOT become a group, and a run whose first note is a
// chord — the <chord/> member carries no <beam>, so the group must stay intact
// and contain only the lead note.
const GROUPS = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type><beam number="1">begin</beam></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type><beam number="1">continue</beam></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type><beam number="1">end</beam></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type><beam number="1">begin</beam></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type><beam number="1">end</beam></note>
    </measure>
  </part>
</score-partwise>`;

describe('groupBeams — per-note markers folded into beamed runs', () => {
  const measure = new MDOMParser().parseFromString(GROUPS).score.getPart('P1')!.getMeasure('1')!;

  it('collapses each begin..end run, drops unbeamed notes, and skips chord members', () => {
    const steps = measure.beams.map((run) => run.map((note) => note.pitch?.step));
    expect(steps).toEqual([
      ['C', 'D', 'E'],
      ['G', 'A'],
    ]);
  });

  it('groupBeams is the primitive measure.beams delegates to', () => {
    expect(groupBeams(measure.notes)).toEqual(measure.beams);
    expect(groupBeams([])).toEqual([]);
  });
});

// How Guitar Pro encodes a triplet-of-16ths + 2-16ths beat: the level-1 beam
// reads begin, continue, end, continue, end — ONE continuous primary beam whose
// sub-beam splits in the middle. Closing the run at the first <end> would leave
// the last two notes flagged. The level-2 markers say where the sub-beam breaks:
// after note 3 (its "end" isn't the run's last note) but not after note 5. A rest
// carrying no beam markers sits under the beam without breaking it either.
const SPLIT = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>12</divisions></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>16th</type>
        <beam number="1">begin</beam><beam number="2">begin</beam></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>16th</type>
        <beam number="1">continue</beam><beam number="2">continue</beam></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><type>16th</type>
        <beam number="1">end</beam><beam number="2">end</beam></note>
      <note><rest/><duration>0</duration><type>16th</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>3</duration><type>16th</type>
        <beam number="1">continue</beam><beam number="2">begin</beam></note>
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>3</duration><type>16th</type>
        <beam number="1">end</beam><beam number="2">end</beam></note>
      <note><pitch><step>A</step><octave>5</octave></pitch><duration>12</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

describe('groupBeamRuns — an <end> does not close the run', () => {
  const measure = new MDOMParser().parseFromString(SPLIT).score.getPart('P1')!.getMeasure('1')!;
  const [run, ...rest] = measure.beamRuns();

  it('keeps the whole begin..end..end span as one primary beam', () => {
    expect(rest).toEqual([]);
    expect(run!.notes.map((note) => note.pitch?.step)).toEqual(['C', 'D', 'E', 'F', 'G']);
  });

  it('reports the secondary break inside the run, not the one that ends it', () => {
    expect(run!.breaksAfter).toEqual([2]); // the sub-beam splits after E
  });

  it('closes the run at the unbeamed quarter that follows', () => {
    expect(measure.beams.map((notes) => notes.length)).toEqual([5]);
    expect(groupBeamRuns([])).toEqual([]);
  });
});
