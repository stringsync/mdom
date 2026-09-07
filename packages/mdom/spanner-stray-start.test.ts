import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A Guitar Pro tab export: every slur is number 1 in voice 1, and the note that
// stops the second span also carries a stray unnumbered start that nothing ever
// closes. Left open, that stale start swallows the next measure's stops and the
// arcs slide one span to the right — a tab curve drawn across a whole measure.
const STRAY_START = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>1</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/></notations></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/><slur type="start"/></notations></note>
  </measure>
  <measure number="2">
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/></notations></note>
    <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('spanner — a stray start that never closes', () => {
  const part = new MDOMParser().parseFromString(STRAY_START).score.getPart('P1')!;
  const [noteC4, noteD4, noteE4, noteF4] = part.getMeasure('1')!.notes;
  const [noteG4, noteA4, noteB4, noteC5] = part.getMeasure('2')!.notes;
  const strayStart = noteF4!.slurs.find((slur) => slur.slurType === 'start')!;
  const stopOnF4 = noteF4!.slurs.find((slur) => slur.slurType === 'stop')!;

  it('leaves the stray dangling instead of letting it eat later stops', () => {
    // A later start supersedes the stale one, so no span slides right.
    expect(noteC4!.slurs[0]!.partner).toBe(noteD4!.slurs[0]!);
    expect(noteE4!.slurs[0]!.partner).toBe(stopOnF4);
    expect(noteG4!.slurs[0]!.partner).toBe(noteA4!.slurs[0]!);
    expect(noteB4!.slurs[0]!.partner).toBe(noteC5!.slurs[0]!);
    expect(strayStart.partner).toBeNull();
  });
});
