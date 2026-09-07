import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Frame, FrameNote } from './frame';

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

    const frames = doc.score?.getPart('P1')?.getMeasure('1')?.frames ?? [];
    expect(frames[0]).toBeInstanceOf(Frame);
    expect(frames[0]?.width).toBe(65);
    expect(frames[0]?.height).toBe(80);
  });

  // A barre-chord diagram: 6 strings, 4-fret box starting at fret 3, string 5
  // barred to string 1, string 6 muted (no frame-note).
  it('reads the musical content — strings, frets, first-fret, and frame-notes', () => {
    const frame = new MDOMParser()
      .parseFromString(`
      <score-partwise><part id="P1"><measure number="1"><harmony><frame>
        <frame-strings>6</frame-strings>
        <frame-frets>4</frame-frets>
        <first-fret>3</first-fret>
        <frame-note><string>5</string><fret>3</fret><barre type="start"/></frame-note>
        <frame-note><string>4</string><fret>5</fret></frame-note>
        <frame-note><string>1</string><fret>3</fret><barre type="stop"/></frame-note>
      </frame></harmony></measure></part></score-partwise>
    `)
      .score.getPart('P1')!
      .getMeasure('1')!.frames[0]!;

    expect(frame.strings).toBe(6);
    expect(frame.frets).toBe(4);
    expect(frame.firstFret).toBe(3);
    expect(frame.frameNotes).toHaveLength(3);
    expect(frame.frameNotes[0]).toBeInstanceOf(FrameNote);
    expect(frame.frameNotes.map((note) => [note.string, note.fret])).toEqual([
      [5, 3],
      [4, 5],
      [1, 3],
    ]);
    expect(frame.frameNotes.map((note) => note.barre)).toEqual(['start', null, 'stop']);
  });

  it('defaults strings to 6 and first-fret to null when absent', () => {
    const frame = new Frame();
    expect(frame.strings).toBe(6);
    expect(frame.firstFret).toBeNull();
  });

  it('throws on a frame-note missing its required string/fret (0 = open must stay distinct)', () => {
    const frameNote = new FrameNote();
    expect(() => frameNote.string).toThrow('<string> in <frame-note>');
  });
});
