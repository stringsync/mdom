import { describe, expect, it } from 'bun:test';
import { Measure } from './measure';
import { Part } from './part';

describe('Part', () => {
  const part = new Part();
  part.setAttribute('id', 'P1');
  for (const number of ['1', '2', '3']) {
    const measure = new Measure();
    measure.setAttribute('number', number);
    part.append(measure);
  }

  it('exposes its id', () => {
    expect(part.id).toBe('P1');
  });

  it('has a null id when unset', () => {
    expect(new Part().id).toBeNull();
  });

  it('lists its measures', () => {
    expect(part.measures.length).toBe(3);
  });

  it('finds a measure by number', () => {
    expect(part.measure('2')?.number).toBe('2');
  });

  it('returns null for an unknown measure number', () => {
    expect(part.measure('9')).toBeNull();
  });
});
