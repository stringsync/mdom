import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Note } from './note';
import type { Measure } from './measure';

// Minimal hand-authored markup parsed into a measure — this exercises the READ
// path: folding <backup>/<forward>/<chord/>/<grace/> already present in the input,
// in shapes the writer wouldn't necessarily emit. (The write path that *generates*
// these elements via the edit API is covered in e2e/crud.test.ts.) divisions=4.
function measureFrom(body: string): Measure {
  const xml = `<score-partwise><part id="P1"><measure number="1"><attributes><divisions>4</divisions></attributes>${body}</measure></part></score-partwise>`;
  return new MDOMParser().parseFromString(xml).score.getPart('P1')!.getMeasure('1')!;
}

function noteXml(step: string, octave: number, duration: number | null, lead = ''): string {
  const dur = duration == null ? '' : `<duration>${duration}</duration>`;
  return `<note>${lead}<pitch><step>${step}</step><octave>${octave}</octave></pitch>${dur}</note>`;
}

const beatsOf = (measure: Measure): (number | null)[] => measure.notes.map((eachNote) => eachNote.measureBeat);

describe('onset fold — backup/forward/chord/grace', () => {
  it('advances the cursor by the duration of each note', () => {
    const measure = measureFrom(`${noteXml('C', 4, 4)}${noteXml('D', 4, 8)}${noteXml('E', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 1, 3]); // quarter, half, quarter
  });

  it('stacks <chord/> notes on the prior onset, adding no time', () => {
    const measure = measureFrom(
      `${noteXml('C', 4, 4)}${noteXml('E', 4, 4, '<chord/>')}${noteXml('G', 4, 4, '<chord/>')}${noteXml('D', 4, 4)}`
    );
    expect(beatsOf(measure)).toEqual([0, 0, 0, 1]);
  });

  it('sits a <grace/> note at the cursor, stealing no time', () => {
    const measure = measureFrom(`${noteXml('C', 5, null, '<grace/>')}${noteXml('D', 4, 4)}${noteXml('E', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 0, 1]);
  });

  it('rewinds the cursor on <backup> so a second voice starts over', () => {
    const measure = measureFrom(
      `${noteXml('C', 4, 8)}${noteXml('D', 4, 8)}<backup><duration>16</duration></backup>` +
        `${noteXml('C', 3, 4)}${noteXml('D', 3, 4)}${noteXml('E', 3, 4)}${noteXml('F', 3, 4)}`
    );
    expect(beatsOf(measure)).toEqual([0, 2, 0, 1, 2, 3]);
  });

  it('opens a gap on <forward>', () => {
    const measure = measureFrom(`${noteXml('C', 4, 4)}<forward><duration>8</duration></forward>${noteXml('D', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 3]);
  });

  it('lets a zero-duration element pass without moving the cursor', () => {
    const direction = '<direction><direction-type><words>cresc.</words></direction-type></direction>';
    const measure = measureFrom(`${noteXml('C', 4, 4)}${direction}${noteXml('D', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 1]);
  });

  it('returns null for a note outside any measure', () => {
    expect(new Note().measureBeat).toBeNull();
  });
});
