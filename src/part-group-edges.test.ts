import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

describe('part-list markers that do not line up', () => {
  const groupsOf = (partList: string, parts = '<part id="P1"><measure number="1"/></part>') =>
    new MDOMParser().parseFromString(`<score-partwise><part-list>${partList}</part-list>${parts}</score-partwise>`)
      .score.partGroups;

  it('ignores a stop whose number never started', () => {
    expect(groupsOf('<score-part id="P1"/><part-group type="stop" number="9"/>')).toEqual([]);
  });

  it('drops a group that covers no part', () => {
    // Start and stop with no <score-part> between them.
    expect(groupsOf('<score-part id="P1"/><part-group type="start"/><part-group type="stop"/>')).toEqual([]);
  });

  it('ignores part-list children that are neither score-part nor part-group', () => {
    const groups = groupsOf('<part-group type="start"/><score-part id="P1"/><foo/><part-group type="stop"/>');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.fromPartIndex).toBe(0);
  });
});
