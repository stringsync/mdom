import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// m1: common time. m2: a composite 3+2/8 meter (two beats/beat-type pairs).
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><time symbol="common"><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>16</duration></note>
    </measure>
    <measure number="2">
      <attributes><time><beats>3</beats><beat-type>8</beat-type><beats>2</beats><beat-type>8</beat-type></time></attributes>
      <note><rest/><duration>10</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('Time', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;

  it('reads a simple meter with a symbol', () => {
    const time = part.getMeasure('1')!.getTime()!;
    expect(time.beats).toBe('4');
    expect(time.beatType).toBe('4');
    expect(time.symbol).toBe('common');
  });

  it('reads a composite meter as ordered components', () => {
    const time = part.getMeasure('2')!.getTime()!;
    expect(time.components).toEqual([
      { beats: '3', beatType: '8' },
      { beats: '2', beatType: '8' },
    ]);
  });
});
