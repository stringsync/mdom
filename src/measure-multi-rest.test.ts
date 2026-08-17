import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import type { Measure } from './measure';

const whole = '<note><rest/><duration>4</duration><type>whole</type></note>';
const restMeasures = (start: number, count: number): string =>
  Array.from({ length: count }, (_unused, offset) => `<measure number="${start + offset}">${whole}</measure>`).join('');

// A 3-measure multirest declared in measure 1, then a 2-measure one in measure 5.
const MULTI_REST = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <clef><sign>G</sign><line>2</line></clef>
        <key><fifths>2</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <measure-style><multiple-rest>3</multiple-rest></measure-style>
      </attributes>
      ${whole}
    </measure>
    ${restMeasures(2, 3)}
    <measure number="5">
      <attributes><measure-style><multiple-rest>2</multiple-rest></measure-style></attributes>
      ${whole}
    </measure>
    ${restMeasures(6, 1)}
  </part>
</score-partwise>`;

describe('Measure.getMultiRestCount', () => {
  const measuresOf = (xml: string): Measure[] => new MDOMParser().parseFromString(xml).score.getPart('P1')!.measures;
  const measures = measuresOf(MULTI_REST);

  it('reads the count from the measure that begins the multirest', () => {
    expect(measures[0]!.getMultiRestCount()).toBe(3);
  });

  it('returns null inside the run — only the first measure begins it', () => {
    expect(measures[1]!.getMultiRestCount()).toBeNull();
    expect(measures[2]!.getMultiRestCount()).toBeNull();
  });

  it('returns null past the end of the run', () => {
    expect(measures[3]!.getMultiRestCount()).toBeNull();
  });

  it('reads a later multirest independently of the first', () => {
    expect(measures[4]!.getMultiRestCount()).toBe(2);
    expect(measures[5]!.getMultiRestCount()).toBeNull();
  });

  it('returns null everywhere when no <measure-style> is present', () => {
    const bare = measuresOf(`<score-partwise><part id="P1">${restMeasures(1, 3)}</part></score-partwise>`);
    expect(bare.map((measure) => measure.getMultiRestCount())).toEqual([null, null, null]);
  });

  it('leaves clef/key/time/divisions carry-forward untouched', () => {
    for (const measure of measures.slice(1, 4)) {
      expect(measure.getClef()?.sign).toBe('G');
      expect(measure.getKey()?.fifths).toBe(2);
      expect(measure.getTime()?.beats).toBe('4');
      expect(measure.notes[0]!.divisions).toBe(1);
    }
  });

  it('selects the <measure-style> matching the staff', () => {
    const [measure] = measuresOf(`<score-partwise><part id="P1">
      <measure number="1">
        <attributes>
          <staves>2</staves>
          <measure-style number="1"><slash type="start"/></measure-style>
          <measure-style number="2"><multiple-rest>4</multiple-rest></measure-style>
        </attributes>
        ${whole}
      </measure>
    </part></score-partwise>`);
    expect(measure!.getMultiRestCount('1')).toBeNull();
    expect(measure!.getMultiRestCount('2')).toBe(4);
  });
});
