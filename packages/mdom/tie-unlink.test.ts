import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

describe('tie — removing a span detaches both ends', () => {
  const TIED = `<score-partwise><part id="P1"><measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
      <notations><tied type="start"/></notations></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
      <notations><tied type="stop"/></notations></note>
  </measure></part></score-partwise>`;

  it('leaves neither end dangling', () => {
    const notes = new MDOMParser().parseFromString(TIED).score.getPart('P1')!.getMeasure('1')!.notes;
    notes[0]!.ties[0]!.unlink();
    expect(notes[0]!.ties).toEqual([]);
    expect(notes[1]!.ties).toEqual([]);
  });

  it('removeTie works from either end and is a no-op on untied notes', () => {
    const notes = new MDOMParser().parseFromString(TIED).score.getPart('P1')!.getMeasure('1')!.notes;
    notes[1]!.removeTie(notes[0]!);
    expect(notes[0]!.ties).toEqual([]);
    expect(notes[1]!.ties).toEqual([]);
    expect(() => notes[0]!.removeTie(notes[1]!)).not.toThrow();
  });
});
