import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

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
