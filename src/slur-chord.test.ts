import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

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
