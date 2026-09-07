import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

describe('Finale — a drum measure of tuplets and beams', () => {
  const measure = loadScore(EXAMPLES.DRUM_TUPLET_BEAMS_MEASURE).parts[0]!.measures[0]!;

  it('reads each drum as a staff position, not a pitch', () => {
    const positions = measure.notes.filter((note) => note.unpitched).map((note) => note.unpitched);
    expect(positions).toHaveLength(10);
    expect(positions[0]).toEqual({ step: 'C', octave: 5 }); // a different row from...
    expect(positions[1]).toEqual({ step: 'A', octave: 4 }); // ...this one
  });

  it('groups the beams and places the measure content', () => {
    expect(measure.beamRuns().map((run) => run.notes.length)).toEqual([5, 5]);
    expect(measure.endBeat).toBe(2);
    expect(measure.notes.flatMap((note) => note.tuplets).map((tuplet) => tuplet.tupletType)).toEqual([
      'start',
      'stop',
      'start',
      'stop',
    ]);
  });
});
