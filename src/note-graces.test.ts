import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// Grace notes steal no timeline time, so they never surface as an onset of their
// own — the only way to reach them is from the note they ornament.
const GRACES = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note>
  <note><grace slash="yes"/><pitch><step>B</step><octave>4</octave></pitch><type>16th</type></note>
  <note><grace/><pitch><step>A</step><octave>4</octave></pitch><type>16th</type></note>
  <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

describe('note — the grace run before a note', () => {
  const measure = new MDOMParser().parseFromString(GRACES).score.getPart('P1')!.getMeasure('1')!;
  const [first, , , second] = measure.notes;

  it('returns the run immediately preceding, in play order', () => {
    expect(second!.gracesBefore.map((note) => note.pitch?.step)).toEqual(['B', 'A']);
    expect(second!.gracesBefore[0]!.graceSlash).toBe(true);
  });

  it('is empty for a note with nothing graced onto it', () => {
    expect(first!.gracesBefore).toEqual([]);
  });

  it('reaches its measure and part without touching .parent', () => {
    expect(first!.measure).toBe(measure);
    expect(first!.part.id).toBe('P1');
    expect(measure.part.id).toBe('P1');
  });
});
