import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';
import type { Note } from './note';

// 4/4, divisions=4 (quarter = 4). m1: two voices written via <backup>, with a
// chord stacked on beat 0 of voice 1. m2: a <forward> skips a beat.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <backup><duration>16</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration><voice>2</voice></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>8</duration><voice>2</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <forward><duration>4</duration></forward>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('Note.measureBeat() — backup/forward as a one-cursor fold', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!;
  const beats = (n: string): (number | null)[] => part.measure(n)!.notes.map((note: Note) => note.measureBeat());

  it('advances the cursor note by note in a single voice', () => {
    // C, E(chord), D, E, F  then backup  then C3, G3
    expect(beats('1')).toEqual([0, 0, 1, 2, 3, 0, 2]);
    //                          ^C ^E-chord (shares beat 0)   ^voice2 after backup
  });

  it('treats <forward> as a gap', () => {
    // quarter @0, forward 1 beat, quarter @2
    expect(beats('2')).toEqual([0, 2]);
  });
});
