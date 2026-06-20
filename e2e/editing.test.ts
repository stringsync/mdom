import { describe, expect, it } from 'bun:test';
import { MDocument, MDOMParser, MusicXMLSerializer } from '../index';

// Intent goes in, correct MusicXML structure comes out, and the read layer
// (measureBeat/staff/voice/beats) confirms it. The caller never writes <backup>,
// <forward>, <duration>, <voice>, or <staff>.
describe('editing notes — intent in, structure out', () => {
  it('lays out two voices on two staves, inserting <backup> itself', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
    measure.setTime({ beats: 4, beatType: 4 });

    const rightHand = measure.voice('1', { staff: '1' });
    rightHand.note({ step: 'C', octave: 4, type: 'quarter' });
    rightHand.note({ step: 'D', octave: 4, type: 'quarter' });
    rightHand.rest({ type: 'half' });

    const leftHand = measure.voice('2', { staff: '2' });
    leftHand.note({ step: 'C', octave: 3, type: 'whole' });

    expect(measure.notes.map((note) => note.measureBeat())).toEqual([0, 1, 2, 0]);
    expect(measure.notes.map((note) => note.staff)).toEqual(['1', '1', '1', '2']);
    expect(measure.notes.map((note) => note.voice)).toEqual(['1', '1', '1', '2']);
  });

  it('computes <duration> from musical type + dots, owning <divisions>', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.voice('1');
    const dottedQuarter = voice.note({ step: 'C', octave: 4, type: 'quarter', dots: 1 });
    const eighth = voice.note({ step: 'D', octave: 4, type: 'eighth' });

    expect(dottedQuarter.beats).toBe(1.5); // no divisions math by the caller
    expect(eighth.beats).toBe(0.5);
    expect(eighth.measureBeat()).toBe(1.5); // follows the dotted quarter
  });

  it('honors an explicit onset, filling the gap with <forward>', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.voice('1');
    voice.note({ step: 'C', octave: 4, type: 'quarter' }); // beat 0
    voice.note({ step: 'G', octave: 4, type: 'quarter', onset: 2 }); // skip beat 1

    expect(measure.notes.map((note) => note.measureBeat())).toEqual([0, 2]);
  });

  it('writes a chord in one call', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();

    const triad = measure.voice('1').chord(
      [
        { step: 'C', octave: 4 },
        { step: 'E', octave: 4 },
        { step: 'G', octave: 4 },
      ],
      { type: 'quarter' }
    );

    expect(triad.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(measure.notes.map((note) => note.isChordMember)).toEqual([false, true, true]);
  });
});

describe('building a score from scratch', () => {
  it('adds a part, wiring up <part-list> and <part-name>', () => {
    const doc = MDocument.empty();
    const part = doc.score!.addPart({ id: 'P1', name: 'Piano' });

    expect(part.id).toBe('P1');
    expect(part.label).toBe('Piano'); // resolved through the <part-list> mdom created
    expect(doc.score!.parts.length).toBe(1);
  });

  it('sets clef/key/time without knowing they live in <attributes>', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();
    measure.setClef({ sign: 'G', line: 2, staff: '1' });
    measure.setKey({ fifths: 2, mode: 'major' });
    measure.setTime({ beats: 3, beatType: 4 });

    expect(measure.clef('1')!.sign).toBe('G');
    expect(measure.key()!.fifths).toBe(2);
    expect(measure.time()!.beats).toBe('3');
  });

  it('round-trips a built score through MusicXML', () => {
    const doc = MDocument.empty();
    const measure = doc.score!.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
    measure.voice('1').note({ step: 'C', octave: 4, type: 'whole' });

    const xml = new MusicXMLSerializer().serializeToString(doc);
    const reparsed = new MDOMParser().parseFromString(xml);

    expect(reparsed.score!.part('P1')!.measure('1')!.notes[0]!.pitch?.step).toBe('C');
  });
});

describe('creating spanners by intent', () => {
  it('slurs one note to another, choosing the number itself', () => {
    const voice = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure().voice('1');
    const first = voice.note({ step: 'C', octave: 4, type: 'quarter' });
    const second = voice.note({ step: 'D', octave: 4, type: 'quarter' });

    first.slurTo(second);

    expect(first.slurs[0]!.slurType).toBe('start');
    expect(first.slurs[0]!.partner()!.note).toBe(second); // the caller never set a number
  });

  it('ties one note to the next', () => {
    const voice = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure().voice('1');
    const first = voice.note({ step: 'C', octave: 4, type: 'half' });
    const second = voice.note({ step: 'C', octave: 4, type: 'half' });

    first.tieTo(second);

    expect(first.ties[0]!.tieType).toBe('start');
    expect(first.ties[0]!.partner()!.note).toBe(second);
  });
});
