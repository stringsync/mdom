import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import type { Note } from './note';

const slurNote = (note: Note, type: 'start' | 'stop'): Note | null =>
  note.slurs.find((s) => s.slurType === type)?.partner()?.note ?? null;

const step = (note: Note | null): string | null => note?.pitch?.step ?? null;

// One part. m1 has a self-contained slur; m2→m3 a cross-measure slur reusing
// number 1; m4 has nested slurs (1 and 2). If pairing were naive, the reused
// number or the nesting would mis-resolve.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="start"/></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="stop"/></notations></note>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="start"/></notations></note>
    </measure>
    <measure number="3">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="stop"/></notations></note>
    </measure>
    <measure number="4">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="start"/><slur number="2" type="start"/></notations></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="2" type="stop"/></notations></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="stop"/></notations></note>
    </measure>
  </part>
</score-partwise>`;

describe('Slur.partner() — spanner pairing as a query', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;
  const notesOf = (n: string): Note[] => part.measure(n)!.notes;

  it('pairs a slur within one measure, both directions', () => {
    const [c, , e] = notesOf('1');
    expect(step(slurNote(c!, 'start'))).toBe('E'); // C's start → E's stop
    expect(step(slurNote(e!, 'stop'))).toBe('C'); // E's stop → C's start
  });

  it('pairs a slur across measures', () => {
    const f = notesOf('2')[0]!;
    const g = notesOf('3')[0]!;
    expect(step(slurNote(f, 'start'))).toBe('G');
    expect(step(slurNote(g, 'stop'))).toBe('F');
  });

  it('does not let a reused number cross-link slurs', () => {
    // C(m1) and F(m2) both open number 1. C must pair with E, not jump to G.
    const c = notesOf('1')[0]!;
    expect(step(slurNote(c, 'start'))).toBe('E');
  });

  it('resolves nested slurs by number', () => {
    const [a, b, c5] = notesOf('4');
    expect(step(b!.slurs[0]!.partner()?.note ?? null)).toBe('A'); // inner (2): B→A
    expect(step(a!.slurs.find((s) => s.number === '1')!.partner()?.note ?? null)).toBe('C'); // outer (1): A→C5
    expect(step(slurNote(c5!, 'stop'))).toBe('A');
  });
});
