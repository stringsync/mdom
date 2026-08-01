import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import type { Note } from './note';

const slurNote = (note: Note, type: 'start' | 'stop'): Note | null =>
  note.slurs.find((s) => s.slurType === type)?.partner?.note ?? null;

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

describe('Slur.partner — spanner pairing as a query', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const notesOf = (n: string): Note[] => part.getMeasure(n)!.notes;

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
    expect(step(b!.slurs[0]!.partner?.note ?? null)).toBe('A'); // inner (2): B→A
    expect(step(a!.slurs.find((s) => s.number === '1')!.partner?.note ?? null)).toBe('C'); // outer (1): A→C5
    expect(step(slurNote(c5!, 'stop'))).toBe('A');
  });
});

// A cross-stave slur, the way Finale exports every other bar of piano writing:
// the slur STARTS in the left hand and STOPS on a right-hand note the exporter
// wrote earlier in the file, because a <backup> puts the lower voice last. In
// document order the stop sits before the start and nothing pairs — the arc runs
// on until measure 2's stop, two bars of ink across the page. In onset order they
// are start (beat 0, lower) then stop (beat 1, upper), which is what sounds.
const CROSS_STAVE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions><staves>2</staves></attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff></note>
    <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff>
      <notations><slur type="stop" number="1"/></notations></note>
    <backup><duration>8</duration></backup>
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><staff>2</staff>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><staff>2</staff></note>
  </measure>
  <measure number="2">
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><staff>1</staff>
      <notations><slur type="stop" number="1"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('slur — paired in onset order, not document order', () => {
  const part = new MDOMParser().parseFromString(CROSS_STAVE).score.getPart('P1')!;
  const [upperC, upperD, lowerC] = part.getMeasure('1')!.notes;
  const nextMeasureNote = part.getMeasure('2')!.notes[0]!;

  it('pairs a slur whose stop was written before its start across a <backup>', () => {
    const start = lowerC!.slurs[0]!;
    const stop = upperD!.slurs[0]!;
    expect(start.slurType).toBe('start');
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
  });

  it('does not run the arc on to a later measure that also stops number 1', () => {
    // The stray stop is orphaned, which is the honest answer — it is not the
    // partner of the left hand's start.
    expect(nextMeasureNote.slurs[0]!.partner).toBeNull();
    expect(upperC!.slurs).toEqual([]);
  });
});

// A chord whose members all slur under number 1 — exporters break the "a number
// can't reopen before it closes" rule constantly. The members open together, so
// voice can't separate them: the oldest open start belongs with the first stop.
const CHORD = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="start" number="1"/></notations></note>
  <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="start" number="1"/></notations></note>
  <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="start" number="1"/></notations></note>
  <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="stop" number="1"/></notations></note>
  <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="stop" number="1"/></notations></note>
  <note><chord/><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="stop" number="1"/></notations></note>
</measure></part></score-partwise>`;

describe('slur — a chord slurred entirely under number 1', () => {
  const notes = new MDOMParser().parseFromString(CHORD).score.getPart('P1')!.getMeasure('1')!.notes;

  it('pairs each member with its counterpart: oldest open start wins', () => {
    const pairs = notes.slice(0, 3).map((note) => [note.pitch!.step, note.slurs[0]!.partner?.note.pitch?.step]);
    expect(pairs).toEqual([
      ['C', 'C'],
      ['E', 'E'],
      ['G', 'G'],
    ]);
  });
});

// Two voices on one stave, each with its own slur under number 1, of DIFFERENT
// lengths — the case a purely positional rule cannot get right. Voice 1's arc
// runs beats 0..2, voice 2's runs beats 0..1, and voice 2 is written after a
// <backup> so its markers interleave with voice 1's once sorted by onset.
const DIVISI = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="start" number="1"/></notations></note>
  <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>
    <notations><slur type="stop" number="1"/></notations></note>
  <backup><duration>12</duration></backup>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice>
    <notations><slur type="start" number="1"/></notations></note>
  <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice>
    <notations><slur type="stop" number="1"/></notations></note>
</measure></part></score-partwise>`;

describe('slur — two voices sharing number 1', () => {
  const notes = new MDOMParser().parseFromString(DIVISI).score.getPart('P1')!.getMeasure('1')!.notes;
  const [upperStart, , upperStop, lowerStart, lowerStop] = notes;

  it('keeps each voice on its own arc, even at different lengths', () => {
    expect(upperStart!.slurs[0]!.partner).toBe(upperStop!.slurs[0]!);
    expect(lowerStart!.slurs[0]!.partner).toBe(lowerStop!.slurs[0]!);
  });

  it('walks the members of that voice own span', () => {
    expect(lowerStart!.slurs[0]!.members.map((slur) => slur.note.pitch?.octave)).toEqual([4, 4]);
  });
});
