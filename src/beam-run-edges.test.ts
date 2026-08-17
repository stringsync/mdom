import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

describe('beam runs — the secondary end that closes the whole beam', () => {
  it('does not report a break after the last note of a run', () => {
    const measure = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>16th</type>
          <beam number="1">begin</beam><beam number="2">begin</beam></note>
        <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>16th</type>
          <beam number="1">end</beam><beam number="2">end</beam></note>
      </measure></part></score-partwise>`
      )
      .score.getPart('P1')!
      .getMeasure('1')!;

    const [run] = measure.beamRuns();
    expect(run!.notes).toHaveLength(2);
    expect(run!.breaksAfter).toEqual([]); // the level-2 end IS the run's end
  });

  it('ignores a continue that never had a begin', () => {
    const measure = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>eighth</type>
          <beam number="1">continue</beam></note>
      </measure></part></score-partwise>`
      )
      .score.getPart('P1')!
      .getMeasure('1')!;
    expect(measure.beamRuns()).toEqual([]);
  });
});
