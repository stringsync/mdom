import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// One <direction> carrying TWO metronomes in successive <direction-type> blocks,
// printed side by side: a metric modulation in the <beat-unit> form ("dotted
// quarter = half") and a swing marking in the <metronome-note> form ("two beamed
// eighths = a triplet quarter-eighth"). The dots trail the unit they modify, so
// only a positional walk tells this from "quarter = dotted half".
const SAMPLE = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <direction placement="above">
    <direction-type>
      <metronome parentheses="yes">
        <beat-unit>quarter</beat-unit><beat-unit-dot/>
        <beat-unit>half</beat-unit>
      </metronome>
    </direction-type>
    <direction-type>
      <metronome>
        <metronome-note>
          <metronome-type>eighth</metronome-type>
          <metronome-beam number="1">begin</metronome-beam>
        </metronome-note>
        <metronome-note>
          <metronome-type>eighth</metronome-type>
          <metronome-beam number="1">end</metronome-beam>
        </metronome-note>
        <metronome-relation>equals</metronome-relation>
        <metronome-note>
          <metronome-type>quarter</metronome-type>
          <metronome-dot/>
          <metronome-tuplet type="start"><actual-notes>3</actual-notes><normal-notes>2</normal-notes></metronome-tuplet>
        </metronome-note>
      </metronome>
    </direction-type>
  </direction>
  <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>ca. 120</per-minute></metronome></direction-type></direction>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

describe('metronome — both notated forms, read whole', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;
  const [paired, rate] = measure.directions;
  const [modulation, swing] = paired!.metronomes;

  it('collects every metronome under the direction, across direction-type blocks', () => {
    expect(paired!.metronomes).toHaveLength(2);
    expect(rate!.metronomes).toHaveLength(1);
  });

  it('pairs each beat unit with the dots that trail it', () => {
    expect(modulation!.beatUnits).toEqual([
      { type: 'quarter', dots: 1 },
      { type: 'half', dots: 0 },
    ]);
    expect(modulation!.parentheses).toBe(true);
  });

  it('keeps per-minute as a string, since MusicXML allows "ca. 120"', () => {
    expect(rate!.metronomes[0]!.perMinute).toBe('ca. 120');
    expect(modulation!.perMinute).toBeNull();
    expect(modulation!.relation).toBeNull(); // written in the beat-unit form
  });

  it('splits the note-group form at <metronome-relation>', () => {
    const relation = swing!.relation!;
    expect(relation.left.map((note) => note.type)).toEqual(['eighth', 'eighth']);
    expect(relation.left.map((note) => note.beams)).toEqual([['begin'], ['end']]);
    expect(relation.right).toHaveLength(1);
    expect(relation.right[0]!.type).toBe('quarter');
    expect(relation.right[0]!.dots).toBe(1);
    expect(relation.right[0]!.tuplet).toEqual({ type: 'start', actual: 3, normal: 2 });
    expect(swing!.beatUnits).toEqual([]);
  });

  it('keeps the old flattened accessor working off the first unit', () => {
    expect(rate!.metronome).toEqual({ beatUnit: 'quarter', dots: 0, perMinute: 'ca. 120' });
    expect(paired!.metronome).toEqual({ beatUnit: 'quarter', dots: 1, perMinute: null });
  });
});
