import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('iReal — rehearsal marks', () => {
  it('reads each mark, with an unstated enclosure staying null', () => {
    const marks = loadScore(EXAMPLES.REHEARSAL_MARKS_BOLIVIA)
      .parts[0]!.measures.flatMap((measure) => measure.directions)
      .flatMap((direction) => direction.rehearsals);
    expect(marks.map((mark) => mark.text)).toEqual(['Intro', 'A', 'B']);
    expect(marks.every((mark) => mark.enclosure === null)).toBe(true);
  });
});
