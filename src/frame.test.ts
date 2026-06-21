import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Frame } from './frame';

describe('Frame', () => {
  it('gets and sets width and height in tenths', () => {
    const frame = new Frame();
    expect(frame.width).toBeNull();
    expect(frame.height).toBeNull();

    frame.width = 65;
    frame.height = 80;
    expect(frame.width).toBe(65);
    expect(frame.height).toBe(80);
    expect(frame.getAttribute('width')).toBe('65');
  });

  it('parses as a typed node, reachable via measure.frames', () => {
    const doc = new MDOMParser().parseFromString(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <harmony>
              <frame height="80" width="65"/>
            </harmony>
          </measure>
        </part>
      </score-partwise>
    `);

    const frames = doc.score?.part('P1')?.measure('1')?.frames ?? [];
    expect(frames[0]).toBeInstanceOf(Frame);
    expect(frames[0]?.width).toBe(65);
    expect(frames[0]?.height).toBe(80);
  });
});
