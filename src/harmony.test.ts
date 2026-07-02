import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Harmony } from './harmony';
import { Frame } from './frame';
import { Note } from './note';

// An Eb7(b9)/Bb chord symbol sitting above a note, plus a bare "C major" harmony
// with no bass/frame to exercise the null branches.
const SAMPLE = `<score-partwise><part id="P1"><measure number="1">
  <harmony>
    <root><root-step>E</root-step><root-alter>-1</root-alter></root>
    <kind text="7(b9)">dominant</kind>
    <bass><bass-step>B</bass-step><bass-alter>-1</bass-alter></bass>
    <frame height="80" width="65"/>
  </harmony>
  <note><chord/><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
  <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
  <harmony>
    <root><root-step>C</root-step><root-alter>0</root-alter></root>
    <kind>major</kind>
  </harmony>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

describe('Harmony', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;
  const [eb7, cMajor] = measure.harmonies;

  it('collects <harmony> as typed nodes via measure.harmonies', () => {
    expect(measure.harmonies).toHaveLength(2);
    expect(eb7).toBeInstanceOf(Harmony);
  });

  it('reads root, kind (with printed text), and bass', () => {
    expect(eb7!.root).toEqual({ step: 'E', alter: -1 });
    expect(eb7!.kind).toEqual({ value: 'dominant', text: '7(b9)' });
    expect(eb7!.bass).toEqual({ step: 'B', alter: -1 });
  });

  it('keeps an explicit <root-alter>0</root-alter> distinct from an absent one, and nulls absent bass/text', () => {
    expect(cMajor!.root).toEqual({ step: 'C', alter: 0 }); // explicit natural, not null
    expect(cMajor!.kind).toEqual({ value: 'major', text: null });
    expect(cMajor!.bass).toBeNull();
  });

  it('exposes the frame, null when absent', () => {
    expect(eb7!.frame).toBeInstanceOf(Frame);
    expect(cMajor!.frame).toBeNull();
  });

  it('binds to the next non-chord note it sits above', () => {
    // The immediately-following <note> is a <chord/> member, so nextNote skips it.
    const target = eb7!.nextNote;
    expect(target).toBeInstanceOf(Note);
    expect(target!.isChordMember).toBe(false);
    expect(target!.pitch!.step).toBe('E');
  });
});
