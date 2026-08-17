import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('Noteflight — navigation landmarks and tempo', () => {
  const directions = loadScore(EXAMPLES.STAVE_REPETITIONS_CODA_ETC).parts[0]!.measures.flatMap(
    (measure) => measure.directions
  );

  it('reads the segno and coda a D.S. jumps to', () => {
    expect(directions.flatMap((direction) => direction.navigations)).toEqual(['segno', 'coda']);
  });

  it('reads the jump instructions as words', () => {
    expect(directions.flatMap((direction) => direction.words)).toEqual(['to coda', 'D.S. al Coda']);
  });
});
