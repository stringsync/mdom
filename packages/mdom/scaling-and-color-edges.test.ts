import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

describe('scaling and colors that had no coverage', () => {
  it('exposes the mm-per-tenth ratio the conversions are built on', () => {
    const scaling = new MDOMParser().parseFromString(
      `<score-partwise><defaults><scaling><millimeters>7</millimeters><tenths>40</tenths></scaling></defaults>
       <part id="P1"><measure number="1"/></part></score-partwise>`
    ).score.scaling;
    expect(scaling.mmPerTenth).toBeCloseTo(0.175);
    expect(scaling.toMillimeters(40)).toBeCloseTo(7);
    expect(scaling.fromMillimeters(7)).toBeCloseTo(40);
  });

  it('normalizes color on the direction marks too', () => {
    const direction = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1">
        <direction color="#FF102030" placement="below">
          <direction-type><dynamics color="#112233"><mf/></dynamics></direction-type>
          <direction-type><rehearsal color="#FF445566">B</rehearsal></direction-type>
        </direction>
      </measure></part></score-partwise>`
      )
      .score.getPart('P1')!
      .getMeasure('1')!.directions[0]!;

    expect(direction.color).toBe('#102030');
    expect(direction.placement).toBe('below');
    expect(direction.dynamics[0]!.color).toBe('#112233');
    expect(direction.rehearsals[0]!.color).toBe('#445566');
  });
});
