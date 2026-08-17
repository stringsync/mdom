import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('LilyPond — the shapes only a positional walk reads', () => {
  it('keeps a syllable elided three ways apart', () => {
    const score = loadScore(EXAMPLES['LILYPOND_61J-LYRICS-ELISIONS']);
    const runs = score.parts[0]!.measures.flatMap((measure) => measure.notes).map((note) => note.lyrics[0]?.runs);
    expect(runs[2]).toEqual([
      { kind: 'text', text: 'd' },
      { kind: 'elision', text: '' },
      { kind: 'text', text: 'e' },
    ]);
    expect(runs[3]!.filter((run) => run.kind === 'elision')).toHaveLength(2);
    expect(runs[3]!.map((run) => run.text).join('')).toBe('fgh'); // what `syllable` collapses to
  });

  it('reads a microtonal key signature in the order given', () => {
    const key = loadScore(EXAMPLES['LILYPOND_13D-KEYSIGNATURES-MICROTONES']).parts[0]!.measures[0]!.getKey()!;
    expect(key.fifths).toBeNull(); // not the circle-of-fifths form at all
    expect(key.alterations.map((alteration) => alteration.alter)).toEqual([-1.5, -1, -0.5, 0, 0.5, 1, 1.5]);
    expect(key.alterations.map((alteration) => alteration.step)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('reaches grace notes that carry no onset of their own', () => {
    const notes = loadScore(EXAMPLES['LILYPOND_24D-AFTERGRACE']).parts[0]!.measures.flatMap((measure) => measure.notes);
    const sounded = notes.filter((note) => !note.isGrace);
    expect(sounded[1]!.gracesBefore.map((grace) => grace.pitch?.step)).toEqual(['G', 'A', 'A']);
    expect(sounded[0]!.gracesBefore).toEqual([]);
    expect(notes.filter((note) => note.isGrace).every((note) => note.duration === null)).toBe(true);
  });
});
