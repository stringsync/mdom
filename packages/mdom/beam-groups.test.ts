import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { groupBeams } from './beam';

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
