import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';

// A crescendo hairpin spanning a measure: an opening <wedge> direction, two
// quarter notes, then a closing <wedge> direction. The wedge hangs off a
// <direction>, not a note — so its endpoint is `.direction` and its onset comes
// from measureBeat() (the beat where the <direction> sits in the timeline).
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
    <measure number="2">
      <direction placement="below"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
  </part>
</score-partwise>`;

describe('Wedge — a direction-attached hairpin', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;

  it('reads the opener type and its host <direction>, not a note', () => {
    // The wedge hangs off a <direction>, so .direction is set and there is no note.
    const crescendo = part.measure('1')!.directions.flatMap((direction) => direction.wedges)[0]!;
    expect(crescendo.wedgeType).toBe('crescendo');
    expect(crescendo.direction).not.toBeNull();
  });

  it('pairs crescendo↔stop by number, across the span', () => {
    // partner() pairs the opener with its matching stop and vice versa.
    const crescendo = part.measure('1')!.directions.flatMap((direction) => direction.wedges)[0]!;
    const stop = crescendo.partner()!;
    expect(stop.wedgeType).toBe('stop');
    expect(stop.partner()).toBe(crescendo);
  });

  it('places each marker by beat via measureBeat()', () => {
    // Onset comes from the <direction>'s position: the opener sits at beat 0, the
    // stop after two quarter notes sits at beat 2.
    const crescendo = part.measure('1')!.directions.flatMap((direction) => direction.wedges)[0]!;
    const stop = crescendo.partner()!;
    expect(crescendo.measureBeat()).toBe(0);
    expect(stop.measureBeat()).toBe(2);
  });

  it('walks every member of the span with members()', () => {
    // members() returns the whole run, opener..closer (here just crescendo, stop).
    const crescendo = part.measure('1')!.directions.flatMap((direction) => direction.wedges)[0]!;
    expect(crescendo.members().map((member) => member.wedgeType)).toEqual(['crescendo', 'stop']);
  });

  it('opens on a diminuendo just as it does on a crescendo', () => {
    // diminuendo is the other opener value; it pairs with stop the same way.
    const diminuendo = part.measure('2')!.directions.flatMap((direction) => direction.wedges)[0]!;
    expect(diminuendo.wedgeType).toBe('diminuendo');
    expect(diminuendo.partner()!.wedgeType).toBe('stop');
  });
});
