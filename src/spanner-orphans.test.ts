import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Slur } from './slur';

// Half-written spans are everywhere in real exports; resolution has to answer
// null rather than pair the wrong ends or throw.
const ORPHANS = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
    <notations><slur type="start" number="1"/><tied type="let-ring"/></notations></note>
  <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration>
    <notations><slur type="stop" number="2"/><slur type="continue" number="3"/></notations></note>
</measure></part></score-partwise>`;

describe('spanners — the half-written spans exporters emit', () => {
  const notes = new MDOMParser().parseFromString(ORPHANS).score.getPart('P1')!.getMeasure('1')!.notes;
  const [first, second] = notes;

  it('leaves an unclosed start with no partner, and itself as its only member', () => {
    const start = first!.slurs[0]!;
    expect(start.partner).toBeNull();
    expect(start.members).toEqual([start]);
  });

  it('leaves a stop with no matching start unpaired', () => {
    const stop = second!.slurs.find((slur) => slur.slurType === 'stop')!;
    expect(stop.partner).toBeNull();
    expect(stop.members).toEqual([stop]);
  });

  it('leaves a continue with no start as its own member', () => {
    const stray = second!.slurs.find((slur) => slur.slurType === 'continue')!;
    expect(stray.partner).toBeNull();
    expect(stray.members).toEqual([stray]);
  });

  it('unlinks a let-ring tie, which has no partner to detach', () => {
    const letRing = first!.ties[0]!;
    expect(letRing.tieType).toBe('let-ring');
    expect(letRing.partner).toBeNull();
    letRing.unlink();
    expect(first!.ties).toEqual([]);
  });

  it('answers null for a marker detached from any part', () => {
    const loose = new Slur();
    loose.setAttribute('type', 'start');
    expect(loose.partner).toBeNull();
    expect(loose.members).toEqual([loose]);
    expect(() => loose.note).toThrow('<note> ancestor of <slur>');
    expect(() => loose.part).toThrow('<part> ancestor of <slur>');
  });
});
