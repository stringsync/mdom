import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A sustain pedal spanning one measure: a <pedal type="start"/> at the downbeat
// and a <pedal type="stop"/> after two quarter notes. Like the wedge, it hangs
// off a <direction> (not a note), so its onset comes from measureBeat(). For
// pedals BOTH `start` and `sostenuto` open the span; only `stop` closes it.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction placement="below"><direction-type><pedal type="start" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <direction placement="below"><direction-type><pedal type="stop" number="1"/></direction-type></direction>
    </measure>
  </part>
</score-partwise>`;

describe('pedal — a direction-attached spanner that pairs start↔stop', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;
  const pedals = part.measure('1')!.directions.flatMap((direction) => direction.pedals);
  const start = pedals[0]!;
  const stop = pedals[1]!;

  it('reads pedalType, number, and the hosting direction off each marker', () => {
    expect(start.pedalType).toBe('start');
    expect(stop.pedalType).toBe('stop');
    expect(start.number).toBe('1'); // pairing key, defaulting to '1'
    expect(start.direction).not.toBeNull(); // hangs off a <direction>, not a note
    expect(start.direction).not.toBe(stop.direction); // each marker has its own direction
  });

  it('pairs the opener with its closer in both directions', () => {
    expect(start.partner()).toBe(stop); // start finds the next matching stop
    expect(stop.partner()).toBe(start); // stop finds the previous matching start
  });

  it('lists both endpoints as members of the span (opener..closer inclusive)', () => {
    expect(start.members()).toEqual([start, stop]);
    expect(stop.members()).toEqual([start, stop]);
  });

  it('locates each marker on the timeline via its direction (in beats)', () => {
    expect(start.measureBeat()).toBe(0); // at the downbeat
    expect(stop.measureBeat()).toBe(2); // after two quarter notes
  });
});
