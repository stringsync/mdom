import { describe, expect, it } from 'bun:test';
import { MDocument, Cursor } from '../index';

/** A fresh voice holding four quarter notes C D E F in one measure. */
function fourNotes() {
  const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
  voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
  voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
  voice.addNote({ step: 'E', octave: 4, type: 'quarter' });
  voice.addNote({ step: 'F', octave: 4, type: 'quarter' });
  return voice;
}

describe('editing', () => {
  it('allows a user to add and remove notes', () => {
    // start with four notes: C D E F
    const voice = fourNotes();
    expect(voice.notes.map((note) => note.pitch!.step)).toEqual(['C', 'D', 'E', 'F']);

    // select the second note by arrowing the caret one step from the start
    const second = Cursor.at(voice).next()!;
    expect(second.note!.pitch!.step).toBe('D');

    // delete the second note; the rest of the voice pulls back to close the gap
    second.note!.remove();
    expect(voice.notes.map((note) => note.pitch!.step)).toEqual(['C', 'E', 'F']);

    // the caret held its onset (beat 1), so it now reads the note that slid under it
    expect(second.note!.pitch!.step).toBe('E');

    // add a note at the end of the voice (the append point past the last note)
    expect(Cursor.at(voice, 3).note).toBeNull();
    voice.addNote({ step: 'A', octave: 4, type: 'quarter' });
    expect(voice.notes.map((note) => note.pitch!.step)).toEqual(['C', 'E', 'F', 'A']);

    // walk the caret to the end (C -> E -> F -> A) and confirm it reaches the new note
    const atA = Cursor.at(voice).next()!.next()!.next()!;
    expect(atA.note!.pitch!.step).toBe('A');
    expect(atA.onset).toBe(3);
    expect(atA.next()).toBeNull();
  });

  it('reshapes a note and the caret still finds the one after it', () => {
    // start with four notes: C D E F
    const voice = fourNotes();

    // select the first note and halve it: quarter -> eighth
    const first = Cursor.at(voice);
    first.note!.setDuration({ type: 'eighth' });

    // D, E, F pull in; the caret (still at beat 0) arrows to D at its new onset
    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 0.5, 1.5, 2.5]);
    expect(first.next()!.onset).toBe(0.5);
    expect(first.next()!.note!.pitch!.step).toBe('D');
  });

  it('silences a note with makeRest; the caret lands on the rest', () => {
    // start with four notes: C D E F
    const voice = fourNotes();

    // select the second note and silence it
    const second = Cursor.at(voice).next()!;
    second.note!.convertToRest();

    // the slot keeps its onset; the caret now reads a rest with no pitch
    expect(second.note!.isRest).toBe(true);
    expect(second.note!.pitch).toBeNull();
    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1, 2, 3]);
  });

  it('corrects a note in place: re-pitch and re-time it', () => {
    // start with four notes: C D E F
    const voice = fourNotes();

    // the second note should have been a half-note G, not a quarter D
    const second = Cursor.at(voice).next()!;
    second.note!.setPitch({ step: 'G', octave: 4 });
    second.note!.setDuration({ type: 'half' });

    // pitch and duration both updated; E and F ripple later by the extra beat
    expect(second.note!.pitch!.step).toBe('G');
    expect(second.note!.beats).toBe(2);
    expect(voice.notes.map((note) => note.measureBeat)).toEqual([0, 1, 3, 4]);
  });

  it('ties a note to its repeat across the caret', () => {
    // build two half-note C's in one measure
    const voice = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure().getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'half' });
    voice.addNote({ step: 'C', octave: 4, type: 'half' });

    // select the first C, advance the caret to the second, and tie them
    const start = Cursor.at(voice);
    const end = start.next()!;
    start.note!.addTie(end.note!);

    // the tie runs from the first note to the exact note under the advanced caret
    expect(start.note!.ties[0]!.tieType).toBe('start');
    expect(start.note!.ties[0]!.partner!.note).toBe(end.note!);
  });

  it('frets a tab riff as the caret walks the staff', () => {
    // build a guitar part with a TAB clef and three notes
    const measure = MDocument.empty().score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure();
    measure.setClef({ sign: 'TAB', line: 5 });
    const voice = measure.getOrCreateVoice('1');
    voice.addNote({ step: 'E', octave: 2, type: 'quarter' });
    voice.addNote({ step: 'A', octave: 2, type: 'quarter' });
    voice.addNote({ step: 'D', octave: 3, type: 'quarter' });

    // walk the caret across the riff, fretting each note as an open string
    const atLowE = Cursor.at(voice);
    atLowE.note!.setStringFret({ string: 6, fret: 0 });
    const atA = atLowE.next()!;
    atA.note!.setStringFret({ string: 5, fret: 0 });
    const atD = atA.next()!;
    atD.note!.setStringFret({ string: 4, fret: 0 });

    // every note carries its string/fret on the tab staff, and the caret ran off the end
    expect(measure.getClef('1')!.sign).toBe('TAB');
    expect(voice.notes.map((note) => note.string)).toEqual([6, 5, 4]);
    expect(voice.notes.map((note) => note.fret)).toEqual([0, 0, 0]);
    expect(atD.next()).toBeNull();
  });
});
