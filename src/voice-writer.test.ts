import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';

// Intent goes in through the Voice writer; the read layer (beats / measureBeat /
// staff / voice) confirms it. The caller never writes <divisions>, <duration>,
// <backup>, <forward>, <voice>, or <staff> — so the assertions read those back
// in divisions-independent musical terms only.
describe('Voice writer — intent in, structure out', () => {
  it('note() appends at the voice cursor, each following the last', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'D', octave: 4, type: 'quarter' });

    expect(measure.notes.map((note) => note.pitch?.step)).toEqual(['C', 'D']);
    expect(measure.notes.map((note) => note.measureBeat)).toEqual([0, 1]);
  });

  it('honors an explicit onset, filling the gap with <forward>', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' }); // beat 0
    voice.addNote({ step: 'G', octave: 4, type: 'quarter', onset: 2 }); // skip beat 1

    expect(measure.notes.map((note) => note.measureBeat)).toEqual([0, 2]);
  });

  it('starts a second voice on staff 2 with a <backup>, resetting its onsets', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();

    const rightHand = measure.getOrCreateVoice('1', { staff: '1' });
    rightHand.addNote({ step: 'C', octave: 4, type: 'quarter' });
    rightHand.addNote({ step: 'D', octave: 4, type: 'quarter' });

    const leftHand = measure.getOrCreateVoice('2', { staff: '2' });
    leftHand.addNote({ step: 'C', octave: 3, type: 'half' });

    // The left hand jumps back to beat 0 (mdom inserted the <backup> itself).
    expect(measure.notes.map((note) => note.measureBeat)).toEqual([0, 1, 0]);
    expect(measure.notes.map((note) => note.staff)).toEqual(['1', '1', '2']);
    expect(measure.notes.map((note) => note.voice)).toEqual(['1', '1', '2']);
  });

  it('rest() and chord() write rests and stacks the read layer recovers', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.getOrCreateVoice('1');
    voice.addRest({ type: 'quarter' });
    const triad = voice.addChord(
      [
        { step: 'C', octave: 4 },
        { step: 'E', octave: 4 },
        { step: 'G', octave: 4 },
      ],
      { type: 'quarter' }
    );

    expect(measure.notes[0]!.isRest).toBe(true);
    expect(triad.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(measure.notes.map((note) => note.isChordMember)).toEqual([false, false, true, true]);
    expect(triad.measureBeat).toBe(1); // the chord follows the quarter rest
  });

  it('computes beats from musical type + dots, owning <divisions>', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.getOrCreateVoice('1');
    const dottedQuarter = voice.addNote({ step: 'C', octave: 4, type: 'quarter', dots: 1 });
    const eighth = voice.addNote({ step: 'D', octave: 4, type: 'eighth' });

    expect(dottedQuarter.beats).toBe(1.5); // no divisions math by the caller
    expect(eighth.beats).toBe(0.5);
    expect(eighth.measureBeat).toBe(1.5); // follows the dotted quarter
  });

  it('throws on a duration its fixed <divisions> cannot represent', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    // A quadruple-dotted 128th lands on a fractional <duration>; mdom refuses
    // rather than emit invalid MusicXML.
    expect(() => voice.addNote({ step: 'C', octave: 4, type: '128th', dots: 4 })).toThrow();
  });
});
