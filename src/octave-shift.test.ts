import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// An <octave-shift> (ottava) spanning m1: a "down" opener and its matching
// "stop". Like every direction-attached spanner it hangs off a <direction>
// (not a note) and pairs start/stop by `number`; `size` is the 8/15/22 interval.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction placement="below"><direction-type><octave-shift type="down" size="8" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note>
      <direction placement="below"><direction-type><octave-shift type="stop" size="8" number="1"/></direction-type></direction>
    </measure>
  </part>
</score-partwise>`;

describe('octave-shift — a direction-attached ottava spanner', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;

  it('reads type, size, and number off the opener, and has no note (it hangs off a direction)', () => {
    const ottava = part.getMeasure('1')!.directions.flatMap((direction) => direction.octaveShifts)[0]!;
    expect(ottava.octaveShiftType).toBe('down');
    expect(ottava.size).toBe(8);
    expect(ottava.number).toBe('1');
    expect(ottava.direction).not.toBeNull();
  });

  it('pairs the down opener with its stop, and members() walks the whole run', () => {
    const ottava = part.getMeasure('1')!.directions.flatMap((direction) => direction.octaveShifts)[0]!;
    const stop = ottava.partner!;
    expect(stop.octaveShiftType).toBe('stop');
    expect(ottava.members.map((member) => member.octaveShiftType)).toEqual(['down', 'stop']);
  });
});
