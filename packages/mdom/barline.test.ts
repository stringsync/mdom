import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import type { Measure } from './measure';

function measureWith(inner: string): Measure {
  return new MDOMParser()
    .parseFromString(
      `<score-partwise><part id="P1"><measure number="1">
       <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>${inner}</measure></part></score-partwise>`
    )
    .score.getPart('P1')!
    .getMeasure('1')!;
}

describe('Barline', () => {
  it('reads bar style and repeat direction through Measure.barlines', () => {
    const [barline] = measureWith(
      `<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>`
    ).barlines;
    expect(barline!.location).toBe('right');
    expect(barline!.barStyle).toBe('light-heavy');
    expect(barline!.repeat).toBe('backward');
  });

  it('defaults location to right and leaves a plain barline repeatless', () => {
    const [barline] = measureWith(`<barline><bar-style>regular</bar-style></barline>`).barlines;
    expect(barline!.location).toBe('right');
    expect(barline!.repeat).toBeNull();
  });

  it('exposes both edges when a measure opens and closes a repeat', () => {
    const measure = measureWith(
      `<barline location="left"><repeat direction="forward"/></barline>` +
        `<barline location="right"><repeat direction="backward"/></barline>`
    );
    expect(measure.barlines.map((barline) => barline.location)).toEqual(['left', 'right']);
    expect(measure.barlines.map((barline) => barline.repeat)).toEqual(['forward', 'backward']);
  });

  it('reads a volta ending, keeping its number a raw list string, null when absent', () => {
    const [voltaStart] = measureWith(`<barline location="left"><ending number="1,2" type="start"/></barline>`).barlines;
    expect(voltaStart!.ending).toEqual({ type: 'start', number: '1,2' });
    const [plain] = measureWith(`<barline location="right"><repeat direction="backward"/></barline>`).barlines;
    expect(plain!.ending).toBeNull();
  });

  it('reads the repeat times count as a number, null without a times attribute', () => {
    const [thrice] = measureWith(
      `<barline location="right"><repeat direction="backward" times="3"/></barline>`
    ).barlines;
    expect(thrice!.repeatTimes).toBe(3);
    const [untimed] = measureWith(`<barline location="right"><repeat direction="backward"/></barline>`).barlines;
    expect(untimed!.repeatTimes).toBeNull();
  });
});
