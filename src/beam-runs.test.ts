import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { groupBeamRuns, groupBeams } from './beam';
import * as barrel from '../index';

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

  // The fold is per-VOICE for a renderer, so it has to be reachable off an
  // arbitrary Note[] — not only measure-scoped. Identity, so the two can't drift.
  it('is exported from the barrel as the same fold measure.beamRuns() delegates to', () => {
    expect(barrel.groupBeamRuns).toBe(groupBeamRuns);
    expect(barrel.groupBeams).toBe(groupBeams);
    expect(groupBeamRuns(measure.notes)).toEqual(measure.beamRuns());
  });
});
