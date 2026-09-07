import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { LineDetail } from './line-detail';

describe('LineDetail', () => {
  it('reads its line and gets/sets width in tenths', () => {
    const detail = new LineDetail();
    detail.line = 3;
    expect(detail.line).toBe(3);

    expect(detail.width).toBeNull();
    detail.width = 1.5;
    expect(detail.width).toBe(1.5);
    expect(detail.getAttribute('width')).toBe('1.5');
  });

  it('throws when line is unset', () => {
    expect(() => new LineDetail().line).toThrow('line on <line-detail>');
  });

  it('is reachable via measure.lineDetails for the staff in effect', () => {
    const doc = new MDOMParser().parseFromString(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <attributes>
              <staff-details>
                <line-detail line="5" width="0.5"/>
              </staff-details>
            </attributes>
          </measure>
        </part>
      </score-partwise>
    `);

    const details = doc.score?.getPart('P1')?.getMeasure('1')?.getLineDetails() ?? [];
    expect(details).toHaveLength(1);
    expect(details[0]).toBeInstanceOf(LineDetail);
    expect(details[0]?.line).toBe(5);
    expect(details[0]?.width).toBe(0.5);
  });
});
