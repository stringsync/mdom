import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// An orchestral part-list: an outer bracket over all four parts, a nested brace
// over the two keyboard staves inside it, plus a group that never stops (which is
// dropped rather than reported as a span running off the end).
const SAMPLE = `<score-partwise>
  <part-list>
    <part-group type="start" number="1">
      <group-name>Strings</group-name>
      <group-abbreviation>Str.</group-abbreviation>
      <group-symbol>bracket</group-symbol>
      <group-barline>yes</group-barline>
    </part-group>
    <score-part id="P1"><part-name>Violin I</part-name></score-part>
    <score-part id="P2"><part-name>Violin II</part-name></score-part>
    <part-group type="start" number="2"><group-symbol>brace</group-symbol></part-group>
    <score-part id="P3"><part-name>Piano RH</part-name></score-part>
    <score-part id="P4"><part-name>Piano LH</part-name></score-part>
    <part-group type="stop" number="2"/>
    <part-group type="stop" number="1"/>
    <part-group type="start" number="3"><group-symbol>line</group-symbol></part-group>
  </part-list>
  <part id="P1"><measure number="1"/></part>
  <part id="P2"><measure number="1"/></part>
  <part id="P3"><measure number="1"/></part>
  <part id="P4"><measure number="1"/></part>
</score-partwise>`;

describe('score — part-group spans resolved from the flat part-list', () => {
  const score = new MDOMParser().parseFromString(SAMPLE).score;
  const groups = score.partGroups;

  it('spans the parts between each start and its stop, outermost first', () => {
    expect(groups.map((group) => [group.fromPartIndex, group.toPartIndex, group.depth])).toEqual([
      [0, 3, 0],
      [2, 3, 1],
    ]);
  });

  it('reads the symbol, names and barline, keeping absence distinct', () => {
    const [outer, inner] = groups;
    expect(outer!.symbol).toBe('bracket');
    expect(outer!.name).toBe('Strings');
    expect(outer!.abbreviation).toBe('Str.');
    expect(outer!.barline).toBe('yes');
    expect(inner!.symbol).toBe('brace');
    expect(inner!.name).toBeNull();
    expect(inner!.barline).toBeNull(); // no default: absence is not "yes"
  });

  it('drops a group whose stop never arrives', () => {
    expect(groups).toHaveLength(2);
  });

  it('is empty when there is no part-list', () => {
    const bare = new MDOMParser().parseFromString('<score-partwise><part id="P1"/></score-partwise>').score;
    expect(bare.partGroups).toEqual([]);
  });
});
