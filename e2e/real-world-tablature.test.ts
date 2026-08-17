import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('Guitar Tab Creator — a tablature part', () => {
  const part = loadScore(EXAMPLES.TABLATURE_BENDS).parts[0]!;
  const tunings = part.getStaffTunings();

  it('reads the six string tunings that identify the staff as tablature', () => {
    expect(part.measures[0]!.getStaveLines()).toBe(6);
    expect(tunings.map((tuning) => tuning.line)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(tunings.map((tuning) => `${tuning.step}${tuning.octave}`)).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });

  it('computes open-string MIDI numbers in standard tuning', () => {
    expect(tunings.map((tuning) => tuning.midi)).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('reads the bends and the technical marks around them', () => {
    const notes = part.measures.flatMap((measure) => measure.notes);
    expect(notes.filter((note) => note.bend)).toHaveLength(4);
    expect(notes.find((note) => note.bend)?.bend).toEqual({ semitones: 4, release: false });
    expect([...new Set(notes.flatMap((note) => note.technicals.map((mark) => mark.technicalType)))]).toEqual([
      'string',
      'fret',
      'bend',
    ]);
  });
});
