import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
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

  it('throws when id is unset', () => {
    expect(() => new Part().id).toThrow('id on <part>');
  });

  it('lists its measures', () => {
    expect(part.measures.length).toBe(3);
  });

  it('finds a measure by number', () => {
    expect(part.getMeasure('2')?.number).toBe('2');
  });

  it('returns null for an unknown measure number', () => {
    expect(part.getMeasure('9')).toBeNull();
  });

  it('reads the part-symbol from the first measure that declares one, null when never declared', () => {
    const withSymbol = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1">
        <measure number="1"><attributes><divisions>256</divisions><staves>2</staves><part-symbol>bracket</part-symbol></attributes></measure>
        <measure number="2"><attributes><part-symbol>brace</part-symbol></attributes></measure>
      </part></score-partwise>`
      )
      .score.getPart('P1')!;
    expect(withSymbol.partSymbol).toBe('bracket'); // first declaration wins

    const without = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1"><attributes><divisions>256</divisions></attributes></measure></part></score-partwise>`
      )
      .score.getPart('P1')!;
    expect(without.partSymbol).toBeNull();
  });
});
