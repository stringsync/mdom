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
