import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A Guitar Pro / Finale chain: the middle note of a run of legato slurs ends one
// span and begins the next, and the exporter writes its start BEFORE its stop.
// The new start is on the stack when the stop is processed, so a recency rule
// would hand the stop its own note's start — a zero-length span, with the real
// opener stranded and its arc stretched across the note in between. Every slur is
// unnumbered, so they all share one stack (an absent number means 1).
const START_BEFORE_STOP = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>1</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start"/></notations></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start"/><slur type="stop"/></notations></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('spanner — a chain-middle note written start-before-stop', () => {
  const part = new MDOMParser().parseFromString(START_BEFORE_STOP).score.getPart('P1')!;
  const [noteC4, noteD4, noteE4] = part.getMeasure('1')!.notes;
  const startOnD4 = noteD4!.slurs.find((slur) => slur.slurType === 'start')!;
  const stopOnD4 = noteD4!.slurs.find((slur) => slur.slurType === 'stop')!;

  it('pairs each marker with its neighbor, never with the note it sits on', () => {
    expect(noteC4!.slurs[0]!.partner).toBe(stopOnD4);
    expect(stopOnD4.partner).toBe(noteC4!.slurs[0]!);
    expect(startOnD4.partner).toBe(noteE4!.slurs[0]!);
    expect(noteE4!.slurs[0]!.partner).toBe(startOnD4);
  });
});
