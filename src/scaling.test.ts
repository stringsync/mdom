import { describe, expect, it } from 'bun:test';
import { MElement } from './m-node';
import { Score } from './score';
import { appendValue } from './measure';
import { Scaling } from './scaling';

describe('Scaling', () => {
  const scaling = new Scaling(7, 40);

  it('converts tenths and millimeters both ways', () => {
    expect(scaling.toMillimeters(40)).toBe(7);
    expect(scaling.toMillimeters(120)).toBe(21);
    expect(scaling.fromMillimeters(7)).toBe(40);
  });

  it('converts tenths and pixels at 96 dpi by default', () => {
    expect(scaling.toPixels(40)).toBeCloseTo((7 / 25.4) * 96);
    expect(scaling.fromPixels(scaling.toPixels(120))).toBeCloseTo(120);
  });

  it('honors a custom dpi', () => {
    expect(scaling.toPixels(40, 144)).toBeCloseTo(scaling.toPixels(40) * 1.5);
  });

  it('defaults to a 7mm staff height', () => {
    expect(Scaling.default.toMillimeters(40)).toBe(7);
  });
});

describe('Score scaling', () => {
  it('reads <defaults><scaling>', () => {
    const score = new Score();
    const defaults = new MElement('defaults');
    const scaling = new MElement('scaling');
    appendValue(scaling, 'millimeters', '7.0');
    appendValue(scaling, 'tenths', '40');
    defaults.append(scaling);
    score.append(defaults);
    expect(score.scaling.millimeters).toBe(7);
    expect(score.scaling.tenths).toBe(40);
  });

  it('falls back to the default when scaling is absent', () => {
    expect(new Score().scaling).toBe(Scaling.default);
  });
});
