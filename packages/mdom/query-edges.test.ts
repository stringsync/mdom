import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { Note } from './note';
import { elementFor } from './registry';

// The empty and half-built shapes a query has to survive: a measure with no
// notes, a note with no measure, a direction that carries nothing, a part-list
// whose markers don't line up. None of these are hypothetical — they're what a
// score looks like mid-edit, and what exporters emit on a bad day.
describe('queries over an empty or detached tree', () => {
  const empty = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();

  it('answers an empty measure without folding a timeline', () => {
    expect(empty.notes).toEqual([]);
    expect(empty.voices).toEqual([]);
    expect(empty.chords).toEqual([]);
    expect(empty.beams).toEqual([]);
    expect(empty.beamRuns()).toEqual([]);
    expect(empty.directions).toEqual([]);
    expect(empty.sounds).toEqual([]);
    expect(empty.figuredBasses).toEqual([]);
    expect(empty.barlines).toEqual([]);
    expect(empty.endBeat).toBe(0); // no divisions declared yet
  });

  it('reports no clef changes in a measure that has no notes to place them against', () => {
    // Every <attributes> here is the measure's own signature block, by definition.
    empty.setClef({ sign: 'G', line: 2 });
    expect(empty.clefChanges()).toEqual([]);
    expect(empty.clefAtEnd()?.sign).toBe('G');
    expect(empty.getStaffTunings()).toEqual([]);
  });

  it('answers null rather than throwing for a note outside any measure', () => {
    const loose = new Note();
    expect(loose.clef).toBeNull();
    expect(loose.key).toBeNull();
    expect(loose.time).toBeNull();
    expect(loose.divisions).toBeNull();
    expect(loose.measureBeat).toBeNull();
    expect(loose.beats).toBeNull();
    expect(loose.gracesBefore).toEqual([]);
    expect(loose.staveCount).toBe(1);
    expect(loose.staveLines).toBe(5);
    expect(() => loose.measure).toThrow('<measure> ancestor of <note>');
    expect(() => loose.part).toThrow('<part> ancestor of <note>');
  });

  it('answers empty for a direction that carries no direction-type children', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P2' }).addMeasure();
    const direction = elementFor('direction');
    measure.append(direction);
    const typed = measure.directions[0]!;
    expect(typed.metronomes).toEqual([]);
    expect(typed.metronome).toBeNull();
    expect(typed.dynamics).toEqual([]);
    expect(typed.rehearsals).toEqual([]);
    expect(typed.words).toEqual([]);
    expect(typed.navigations).toEqual([]);
    expect(typed.sound).toBeNull();
    expect(typed.soundTempo).toBeNull();
    expect(typed.staff).toBe('1');
    expect(typed.placement).toBeNull();
    expect(typed.color).toBeNull();
    expect(typed.measure).toBe(measure);
  });
});
