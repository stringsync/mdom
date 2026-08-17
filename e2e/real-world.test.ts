import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

// compatibility.test.ts proves the corpus round-trips; this proves it can be
// READ: the query accessors pointed at the real exporter output that motivated
// them. A synthetic fragment can't show that Finale really does write 792
// `new-system="no"` measures.

describe('Finale + Dolet — a 22-part orchestral score', () => {
  const score = loadScore(EXAMPLES.ACTOR_PRELUDE_SAMPLE);
  const measures = score.parts.flatMap((part) => part.measures);
  const notes = measures.flatMap((measure) => measure.notes);

  it('resolves the part-list brackets and braces, outermost first', () => {
    const groups = score.partGroups;
    expect(score.parts).toHaveLength(22);
    expect(groups[0]).toEqual({
      fromPartIndex: 0,
      toPartIndex: 6,
      symbol: 'bracket',
      name: null,
      abbreviation: null,
      barline: 'yes',
      depth: 0,
    });
    // An enclosing group always opens before the one it encloses, so start order
    // never puts a child ahead of its parent.
    expect(groups.every((group, index) => index === 0 || groups[index - 1]!.depth <= group.depth + 1)).toBe(true);
    expect(groups.some((group) => group.symbol === 'brace' && group.name === 'Horns in F')).toBe(true);
    expect(groups.some((group) => group.barline === 'no')).toBe(true); // absence is not the only non-'yes'
  });

  it('keeps new-system="no" distinct from an absent attribute', () => {
    // The whole reason the tri-state exists: this exporter states "stays on its
    // line" 792 times, which a boolean reads as identical to silence.
    const prints = measures.flatMap((measure) => (measure.print ? [measure.print] : []));
    expect(prints.filter((print) => print.systemBreak === 'no')).toHaveLength(792);
    expect(prints.filter((print) => print.systemBreak === 'yes')).toHaveLength(22);
    expect(prints.filter((print) => print.systemBreak === null)).toHaveLength(88);
    expect(prints.filter((print) => print.newSystem)).toHaveLength(22); // the boolean still agrees
  });

  it('finds the spacer notes that hold a tick but draw nothing', () => {
    expect(notes).toHaveLength(2945);
    expect(notes.filter((note) => !note.printObject)).toHaveLength(303);
  });

  it('reads percussion staff positions and open noteheads', () => {
    expect(notes.filter((note) => note.unpitched)).toHaveLength(237);
    expect(notes.find((note) => note.unpitched)?.unpitched).toEqual({ step: 'E', octave: 5 });
    expect(notes.filter((note) => note.notehead?.filled === false)).toHaveLength(13);
  });

  it('reads dynamics by tag and playback velocities off <sound>', () => {
    const marks = measures
      .flatMap((measure) => measure.directions)
      .flatMap((direction) => direction.dynamics)
      .flatMap((dynamics) => dynamics.marks);
    expect(marks.slice(0, 3)).toEqual(['p', 'f', 'ff']);
    expect(measures.flatMap((measure) => measure.sounds).filter((sound) => sound.dynamics != null)).toHaveLength(228);
  });

  it('reads the tempo mark in its beat-unit form', () => {
    const metronome = measures
      .flatMap((measure) => measure.directions)
      .flatMap((direction) => direction.metronomes)[0]!;
    expect(metronome.beatUnits).toEqual([{ type: 'quarter', dots: 0 }]);
    expect(metronome.perMinute).toBe('85');
    expect(metronome.relation).toBeNull();
  });
});
