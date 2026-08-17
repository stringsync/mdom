import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('W3C — a part-group over a concert score', () => {
  it('spans every part in the list', () => {
    const score = loadScore(EXAMPLES.CONCERT_SCORE_AND_FOR_PART);
    expect(score.partGroups).toEqual([
      {
        fromPartIndex: 0,
        toPartIndex: score.parts.length - 1,
        symbol: 'bracket',
        name: null,
        abbreviation: null,
        barline: 'yes',
        depth: 0,
      },
    ]);
  });
});
