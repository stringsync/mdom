import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';

describe('Measure', () => {
  it('exposes its number', () => {
    const measure = new Measure();
    measure.setAttribute('number', '4');
    expect(measure.number).toBe('4');
  });

  it('throws when number is unset', () => {
    expect(() => new Measure().number).toThrow('number on <measure>');
  });

  it('gets and sets width', () => {
    const measure = new Measure();
    expect(measure.width).toBeNull();
    measure.width = 120.5;
    expect(measure.width).toBe(120.5);
    expect(measure.getAttribute('width')).toBe('120.5');
  });

  it('lists only notes, ignoring other measure children', () => {
    const measure = new Measure();
    measure.append(new MElement('attributes'));
    measure.append(new Note());
    measure.append(new MElement('backup'));
    measure.append(new Note());
    expect(measure.notes.length).toBe(2);
  });

  it('lists no notes when empty', () => {
    expect(new Measure().notes.length).toBe(0);
  });

  it('reports its zero-based index within its part', () => {
    const part = new Part();
    const first = new Measure();
    const second = new Measure();
    part.append(first);
    part.append(second);
    expect(first.index).toBe(0);
    expect(second.index).toBe(1);
  });

  it('has index -1 when not in a part', () => {
    expect(new Measure().index).toBe(-1);
  });
});

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
