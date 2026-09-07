import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// The same shared spanner surface as the note-attached kinds, hung off
// `<direction-type>` instead of `<notations>`: the endpoint is a direction and a
// measure rather than a note and a part. One opening direction in m1, one closing
// direction in m2, carrying all five families at once.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <direction><direction-type>
      <wedge type="crescendo" number="1"/>
      <pedal type="start" number="1" line="yes"/>
      <octave-shift type="down" size="15" number="1" line-type="dashed"/>
      <bracket type="start" number="1" line-end="up"/>
      <dashes type="start" number="1"/>
    </direction-type></direction>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="2">
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
    <direction><direction-type>
      <wedge type="stop" number="1"/>
      <pedal type="stop" number="1"/>
      <octave-shift type="stop" number="1"/>
      <bracket type="stop" number="1" line-end="up"/>
      <dashes type="stop" number="1"/>
    </direction-type></direction>
  </measure>
</part></score-partwise>`;

describe('direction-attached spanners — the same shape off a <direction>', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const openDirection = part.getMeasure('1')!.directions[0]!;
  const closeDirection = part.getMeasure('2')!.directions[0]!;

  it('pairs a wedge in both directions, knowing its direction and measure', () => {
    const start = openDirection.wedges[0]!;
    const stop = closeDirection.wedges[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.direction).toBe(openDirection);
    expect(start.measure).toBe(part.getMeasure('1')!);
    expect(stop.measure).toBe(part.getMeasure('2')!);
    expect(start.members).toEqual([start, stop]);
    expect(start.measureBeat).toBe(0);
  });

  it('pairs a pedal in both directions, knowing its direction and measure', () => {
    const start = openDirection.pedals[0]!;
    const stop = closeDirection.pedals[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.direction).toBe(openDirection);
    expect(start.measure).toBe(part.getMeasure('1')!);
    expect(stop.measure).toBe(part.getMeasure('2')!);
    expect(start.members).toEqual([start, stop]);
    expect(start.measureBeat).toBe(0);
  });

  it('pairs an octave shift in both directions, knowing its direction and measure', () => {
    const start = openDirection.octaveShifts[0]!;
    const stop = closeDirection.octaveShifts[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.direction).toBe(openDirection);
    expect(start.measure).toBe(part.getMeasure('1')!);
    expect(stop.measure).toBe(part.getMeasure('2')!);
    expect(start.members).toEqual([start, stop]);
    expect(start.measureBeat).toBe(0);
  });

  it('pairs a bracket in both directions, knowing its direction and measure', () => {
    const start = openDirection.brackets[0]!;
    const stop = closeDirection.brackets[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.direction).toBe(openDirection);
    expect(start.measure).toBe(part.getMeasure('1')!);
    expect(stop.measure).toBe(part.getMeasure('2')!);
    expect(start.members).toEqual([start, stop]);
    expect(start.measureBeat).toBe(0);
  });

  it('pairs dashes in both directions, knowing its direction and measure', () => {
    const start = openDirection.dashes[0]!;
    const stop = closeDirection.dashes[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.direction).toBe(openDirection);
    expect(start.measure).toBe(part.getMeasure('1')!);
    expect(stop.measure).toBe(part.getMeasure('2')!);
    expect(start.members).toEqual([start, stop]);
    expect(start.measureBeat).toBe(0);
  });

  it('reads each kind own attributes', () => {
    expect(openDirection.wedges[0]!.wedgeType).toBe('crescendo');
    expect(openDirection.pedals[0]!.pedalType).toBe('start');
    expect(openDirection.pedals[0]!.line).toBe(true);
    expect(openDirection.octaveShifts[0]!.size).toBe(15);
    expect(openDirection.octaveShifts[0]!.lineType).toBe('dashed');
    expect(closeDirection.octaveShifts[0]!.size).toBe(8); // absent size defaults to 8
    expect(openDirection.brackets[0]!.lineEnd).toBe('up');
    expect(openDirection.dashes[0]!.dashesType).toBe('start');
  });
});
