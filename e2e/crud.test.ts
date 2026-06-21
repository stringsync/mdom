import { describe, expect, it } from 'bun:test';
import { MDocument, MDOMParser, MusicXMLSerializer } from '../index';

// One operation per test: arrange a little music, apply a single intent-level
// edit, then read it back through the query layer. The caller works in musical
// terms throughout — pitches, beats, strings, frets — and never writes
// <duration>, <backup>, <forward>, <voice>, <staff>, or <technical> by hand.
// This is the editing surface a basic notation editor (guitar included) drives.
describe('editing a score by intent — CRUD', () => {
  it('appends notes along the voice cursor', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'E', octave: 4, type: 'quarter' });

    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1, 2]);
  });

  it('computes <duration> from the note type and dots', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const dotted = voice.addNote({ step: 'C', octave: 4, type: 'quarter', dots: 1 });
    const eighth = voice.addNote({ step: 'D', octave: 4, type: 'eighth' });

    expect(dotted.beats).toBe(1.5);
    expect(eighth.beats).toBe(0.5);
    expect(eighth.measureBeat).toBe(1.5); // lands right after the dotted quarter
  });

  it('honors an explicit onset, filling the gap with <forward>', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' }); // beat 0
    voice.addNote({ step: 'G', octave: 4, type: 'quarter', onset: 2 }); // skip beat 1

    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 2]);
  });

  it('stacks a chord on one onset', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const triad = voice.addChord(
      [
        { step: 'C', octave: 4 },
        { step: 'E', octave: 4 },
        { step: 'G', octave: 4 },
      ],
      { type: 'quarter' }
    );

    expect(triad.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(triad.notes.map((note) => note.isChordMember)).toEqual([false, true, true]);
  });

  it('lays a second voice on its own staff, inserting the <backup> itself', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
    measure.setTime({ beats: 4, beatType: 4 });

    const rightHand = measure.getOrCreateVoice('1', { staff: '1' });
    rightHand.addNote({ step: 'C', octave: 4, type: 'quarter' });
    rightHand.addNote({ step: 'D', octave: 4, type: 'quarter' });
    rightHand.addRest({ type: 'half' });
    measure.getOrCreateVoice('2', { staff: '2' }).addNote({ step: 'C', octave: 3, type: 'whole' });

    expect(measure.notes.map((note) => note.measureBeat)).toEqual([0, 1, 2, 0]);
    expect(measure.notes.map((note) => note.staff)).toEqual(['1', '1', '1', '2']);
  });

  it('retunes a note in place with setPitch, moving no time', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });

    second.setPitch({ step: 'E', octave: 4, alter: -1 }); // D -> E-flat

    expect(second.pitch!.step).toBe('E');
    expect(second.pitch!.alter).toBe(-1);
    expect(second.measureBeat).toBe(1); // a pitch edit moves no time
  });

  it('reshapes a note with setDuration, rippling the rest of the voice in', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'E', octave: 4, type: 'quarter' });

    first.setDuration({ type: 'eighth' }); // quarter -> eighth; mdom recomputes <duration>

    expect(first.beats).toBe(0.5);
    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 0.5, 1.5]); // D, E pulled in
  });

  it('keeps a sibling voice anchored by repairing the handoff <backup>', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
    measure.setTime({ beats: 4, beatType: 4 });

    const upper = measure.getOrCreateVoice('1', { staff: '1' });
    const head = upper.addNote({ step: 'C', octave: 5, type: 'quarter' });
    upper.addNote({ step: 'D', octave: 5, type: 'quarter' });
    const bass = measure.getOrCreateVoice('2', { staff: '2' }).addNote({ step: 'C', octave: 3, type: 'half' });

    head.setDuration({ type: 'eighth' }); // the upper voice loses half a beat

    expect(bass.measureBeat).toBe(0); // the <backup> shrank to match; no drift
    expect(upper.notes.map((note) => note.measureBeat)).toEqual([0, 0.5]);
  });

  it('turns a note into a grace note, its stolen time absorbed by the next', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const ornament = voice.addNote({ step: 'C', octave: 5, type: 'eighth' });
    voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'E', octave: 4, type: 'quarter' });

    ornament.convertToGrace(); // eighth -> grace note before D

    expect(ornament.isGrace).toBe(true);
    expect(ornament.duration).toBeNull(); // grace notes carry no <duration>
    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 0, 1]);
  });

  it('silences a note with makeRest, keeping the slot and the beat', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
    voice.addNote({ step: 'E', octave: 4, type: 'quarter' });

    second.convertToRest(); // the note's time survives as a rest

    expect(second.isRest).toBe(true);
    expect(second.pitch).toBeNull();
    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1, 2]); // nothing shifted
  });

  it('removes a note and closes the gap, because onsets are derived', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
    const third = voice.addNote({ step: 'E', octave: 4, type: 'half' });

    second.remove(); // raw tree primitive; one voice needs no <backup>/<forward> bookkeeping

    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1]); // E pulled back
    expect(third.measureBeat).toBe(1);
  });

  it('ties one note to the next, mdom choosing the number', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const first = voice.addNote({ step: 'C', octave: 4, type: 'half' });
    const second = voice.addNote({ step: 'C', octave: 4, type: 'half' });

    first.addTie(second);

    expect(first.ties[0]!.tieType).toBe('start');
    expect(first.ties[0]!.partner!.note).toBe(second); // the caller never set a number
  });

  it('unties two notes, taking both <tied> ends so neither dangles', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const first = voice.addNote({ step: 'C', octave: 4, type: 'half' });
    const second = voice.addNote({ step: 'C', octave: 4, type: 'half' });
    first.addTie(second);

    first.removeTie(second);

    expect(first.ties.length).toBe(0);
    expect(second.ties.length).toBe(0); // the partner <tied stop> went with it
  });

  it('cuts one link of a tie chain, leaving the rest tied', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    const middle = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    const last = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    first.addTie(middle);
    middle.addTie(last); // the middle note now holds both ends

    middle.removeTie(first); // name which one to cut

    expect(first.ties.length).toBe(0);
    expect(middle.ties[0]!.partner!.note).toBe(last); // only the start toward `last` survives
  });

  it('slurs one note to another, surviving an in-place edit of the start', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
    const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
    first.addSlur(second);

    first.setPitch({ step: 'C', octave: 4, alter: 1 }); // C -> C#, in place

    expect(first.slurs[0]!.slurType).toBe('start');
    expect(first.slurs[0]!.partner!.note).toBe(second); // the edit didn't orphan it
  });

  it('writes a TAB clef for a tablature staff', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure();

    measure.setClef({ sign: 'TAB', line: 5 });

    expect(measure.getClef('1')!.sign).toBe('TAB');
  });

  it('writes a guitar octave clef (treble-8)', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure();

    measure.setClef({ sign: 'G', line: 2, octaveChange: -1 });

    expect(measure.getClef('1')!.octaveChange).toBe(-1);
  });

  it('frets a note on a string with setStringFret (a tab note keeps its pitch)', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure().getOrCreateVoice('1');
    const note = voice.addNote({ step: 'E', octave: 2, type: 'quarter' });

    note.setStringFret({ string: 6, fret: 0 }); // open low E

    expect(note.string).toBe(6);
    expect(note.fret).toBe(0);
    expect(note.pitch!.step).toBe('E'); // the sounding pitch is untouched
  });

  it('re-frets a note in place, upserting <string>/<fret> rather than duplicating', () => {
    const voice = MDocument.empty().score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure().getOrCreateVoice('1');
    const note = voice.addNote({ step: 'E', octave: 2, type: 'quarter' });
    note.setStringFret({ string: 6, fret: 0 });

    note.setStringFret({ string: 5, fret: 7 }); // moved, not duplicated

    expect(note.string).toBe(5);
    expect(note.fret).toBe(7);
  });

  it('round-trips a tab note through MusicXML', () => {
    const doc = MDocument.empty();
    const note = doc.score
      .addPart({ id: 'P1', name: 'Guitar' })
      .addMeasure()
      .getOrCreateVoice('1')
      .addNote({ step: 'A', octave: 2, type: 'quarter' });
    note.setStringFret({ string: 5, fret: 0 });

    const xml = new MusicXMLSerializer().serializeToString(doc);
    const read = new MDOMParser().parseFromString(xml).score.getPart('P1')!.getMeasure('1')!.notes[0]!;

    expect(read.string).toBe(5);
    expect(read.fret).toBe(0);
  });
});
