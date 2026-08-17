import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// 4/4, divisions=4. A <direction> holding a crescendo wedge sits at beat 0, then
// after two quarter notes a second <direction> holds the closing wedge. A
// <direction> carries no <duration> of its own — its place in the timeline is the
// cursor position where it sits in the backup/forward fold.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
  </part>
</score-partwise>`;

describe('direction — spanner collectors and timeline position', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;

  it('collects every <direction> in the measure', () => {
    expect(measure.directions).toHaveLength(2);
  });

  it('reads the wedges under a <direction>, with absent spanner kinds as empty arrays', () => {
    const direction = measure.directions[0]!;
    expect(direction.wedges.map((wedge) => wedge.wedgeType)).toEqual(['crescendo']);
    expect(direction.pedals).toEqual([]);
    expect(direction.octaveShifts).toEqual([]);
  });

  it('places each <direction> on the beat where its cursor sits', () => {
    const [first, second] = measure.directions;
    expect(first!.measureBeat).toBe(0);
    expect(second!.measureBeat).toBe(2); // after two quarter notes
  });
});
