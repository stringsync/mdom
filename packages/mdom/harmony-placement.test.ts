import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

describe('harmony and figured bass — placement and ancestry', () => {
  const measure = new MDOMParser()
    .parseFromString(
      `<score-partwise><part id="P1"><measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <harmony placement="above"><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <harmony><root><root-step>G</root-step></root></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure></part></score-partwise>`
    )
    .score.getPart('P1')!
    .getMeasure('1')!;

  it('reads placement and the measure it sits in', () => {
    const [first, second] = measure.harmonies;
    expect(first!.placement).toBe('above');
    expect(second!.placement).toBeNull();
    expect(first!.measure).toBe(measure);
  });

  it('returns null for a harmony that states no kind', () => {
    expect(measure.harmonies[0]!.kind).toEqual({ value: 'major-seventh', text: 'maj7' });
    expect(measure.harmonies[1]!.kind).toBeNull();
    expect(measure.harmonies[1]!.bass).toBeNull();
  });
});
