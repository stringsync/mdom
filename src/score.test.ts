import { describe, expect, it } from 'bun:test';
import { MElement } from './m-node';
import { Part } from './part';
import { Score } from './score';

describe('Score', () => {
  const score = new Score();
  score.append(new MElement('part-list'));
  for (const id of ['P1', 'P2']) {
    const part = new Part();
    part.setAttribute('id', id);
    score.append(part);
  }

  it('lists only its parts, ignoring other children', () => {
    expect(score.parts.length).toBe(2);
  });

  it('finds a part by id', () => {
    expect(score.part('P2')?.id).toBe('P2');
  });

  it('returns null for an unknown part id', () => {
    expect(score.part('P9')).toBeNull();
  });
});
