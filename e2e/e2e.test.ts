import { describe, expect, it } from 'bun:test';
import { MDocument, Cursor } from '../index';

// The keyboard side of editing. A transcriber arrows through the score, lands on
// notes and empty slots, and edits whatever the caret is over. The caret is an
// immutable position: two of them can be held at once (a phrase's endpoints), and
// the node under the caret — a note, a measure — is edited directly, not "through
// the cursor". This is the navigation surface a basic notation editor drives.
describe('navigating a score with a cursor', () => {
  function guitarLine() {
    const part = MDocument.empty().score.addPart({ id: 'P1', name: 'Guitar' });
    const m1 = part.addMeasure();
    const firstBar = m1.getOrCreateVoice('1');
    firstBar.addNote({ step: 'E', octave: 3, type: 'quarter' });
    firstBar.addNote({ step: 'F', octave: 3, type: 'quarter' });
    firstBar.addNote({ step: 'G', octave: 3, type: 'quarter' });
    firstBar.addNote({ step: 'A', octave: 3, type: 'quarter' });
    const m2 = part.addMeasure();
    const secondBar = m2.getOrCreateVoice('1');
    secondBar.addNote({ step: 'B', octave: 3, type: 'quarter' });
    secondBar.addNote({ step: 'C', octave: 3, type: 'quarter' });
    return { part, m1, m2 };
  }

  it('walks the whole part note by note, across the barline', () => {
    const { m1 } = guitarLine();
    const atE = Cursor.at(m1.getOrCreateVoice('1'));
    const atF = atE.next()!;
    const atG = atF.next()!;
    const atA = atG.next()!;
    const atB = atA.next()!; // across the barline into m2
    const atC = atB.next()!;

    const steps = [atE, atF, atG, atA, atB, atC].map((cursor) => cursor.note!.pitch!.step);
    expect(steps).toEqual(['E', 'F', 'G', 'A', 'B', 'C']);
    expect(atC.next()).toBeNull(); // ran off the end of the part
  });

  it('walks backward from the last note to the first', () => {
    const { m2 } = guitarLine();
    const atC = Cursor.at(m2.notes[1]!); // land on the last note via the note itself
    const atB = atC.prev()!;
    const atA = atB.prev()!; // across the barline back into m1
    const atG = atA.prev()!;
    const atF = atG.prev()!;
    const atE = atF.prev()!;

    const steps = [atC, atB, atA, atG, atF, atE].map((cursor) => cursor.note!.pitch!.step);
    expect(steps).toEqual(['C', 'B', 'A', 'G', 'F', 'E']);
    expect(atE.prev()).toBeNull(); // before the first note of the part
  });

  it('reads the empty slot past the last note as the append point', () => {
    const { m1 } = guitarLine();
    expect(Cursor.at(m1.getOrCreateVoice('1'), 0).note!.pitch!.step).toBe('E');
    expect(Cursor.at(m1.getOrCreateVoice('1'), 4).note).toBeNull();
  });

  it('holds two live carets to slur a phrase from its first note to its last', () => {
    const { m1 } = guitarLine();
    const first = Cursor.at(m1.getOrCreateVoice('1')); // E
    const last = Cursor.at(m1.notes[3]!); // A — `first` is still valid alongside it

    first.note!.addSlur(last.note!);

    expect(first.note!.slurs[0]!.slurType).toBe('start');
    expect(first.note!.slurs[0]!.partner!.note).toBe(last.note!);
  });

  it('selects the measure under the caret to set its width', () => {
    const { m2 } = guitarLine();
    const cursor = Cursor.at(m2.notes[0]!);

    cursor.measure.width = 144; // object selection: the cursor locates it, the node owns the edit

    expect(m2.width).toBe(144);
  });
});

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
