import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { Cursor } from './cursor';

// A two-measure single line: m1 = C D E F (quarters), m2 = G A. The cursor is an
// immutable caret addressed by (measure, voice, onset-in-beats), so moving
// returns a new cursor and `note` is a live lookup — null on a gap or past the
// last note.
function twoMeasures() {
  const part = MDocument.empty().score!.addPart({ id: 'P1' });
  const m1 = part.addMeasure();
  const firstBar = m1.voice('1');
  firstBar.note({ step: 'C', octave: 4, type: 'quarter' });
  firstBar.note({ step: 'D', octave: 4, type: 'quarter' });
  firstBar.note({ step: 'E', octave: 4, type: 'quarter' });
  firstBar.note({ step: 'F', octave: 4, type: 'quarter' });
  const m2 = part.addMeasure();
  const secondBar = m2.voice('1');
  secondBar.note({ step: 'G', octave: 4, type: 'quarter' });
  secondBar.note({ step: 'A', octave: 4, type: 'quarter' });
  return { part, m1, m2 };
}

describe('Cursor — an immutable timeline caret', () => {
  it('reads the note starting at its onset', () => {
    const { m1 } = twoMeasures();
    expect(Cursor.at(m1.voice('1')).note?.pitch?.step).toBe('C');
    expect(Cursor.at(m1.voice('1'), 2).note?.pitch?.step).toBe('E');
  });

  it('reads null on a gap and past the last note', () => {
    const voice = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure().voice('1');
    voice.note({ step: 'C', octave: 4, type: 'quarter' }); // beat 0
    voice.note({ step: 'G', octave: 4, type: 'quarter', onset: 2 }); // beat 2, gap at beat 1

    expect(Cursor.at(voice, 1).note).toBeNull(); // the <forward> gap
    expect(Cursor.at(voice, 3).note).toBeNull(); // past the last note
  });

  it('steps note to note by onset', () => {
    const { m1 } = twoMeasures();
    const start = Cursor.at(m1.voice('1'));
    expect(start.onset).toBe(0);
    expect(start.next()?.onset).toBe(1);
    expect(start.next()?.next()?.note?.pitch?.step).toBe('E');
  });

  it('crosses the barline into the next measure, same voice', () => {
    const { m1, m2 } = twoMeasures();
    const firstOfM2 = Cursor.at(m1.voice('1'), 3).next(); // from F (m1) onward

    expect(firstOfM2?.measure).toBe(m2);
    expect(firstOfM2?.onset).toBe(0);
    expect(firstOfM2?.note?.pitch?.step).toBe('G');

    expect(firstOfM2?.prev()?.measure).toBe(m1);
    expect(firstOfM2?.prev()?.note?.pitch?.step).toBe('F');
  });

  it('returns null past the ends of the part', () => {
    const { m1, m2 } = twoMeasures();
    expect(Cursor.at(m1.voice('1')).prev()).toBeNull(); // before the first note
    expect(Cursor.at(m2.voice('1'), 1).next()).toBeNull(); // after the last note
  });

  it('is immutable — moving returns a new cursor, the old one stays put', () => {
    const { m1 } = twoMeasures();
    const here = Cursor.at(m1.voice('1'));
    const next = here.next();

    expect(here.onset).toBe(0); // unchanged
    expect(next?.onset).toBe(1);
    expect(next).not.toBe(here);
  });

  it('looks the note up live, so appending elsewhere does not stale it', () => {
    const { m1 } = twoMeasures();
    const atBeat2 = Cursor.at(m1.voice('1'), 2);
    expect(atBeat2.note?.pitch?.step).toBe('E');

    m1.voice('1').note({ step: 'B', octave: 4, type: 'quarter' }); // append at beat 4
    expect(atBeat2.note?.pitch?.step).toBe('E'); // still E — the caret is a coordinate
  });

  it('tracks the onset, not a node: a removal pulls the next note under the caret', () => {
    const { m1 } = twoMeasures();
    const atBeat2 = Cursor.at(m1.voice('1'), 2); // E
    m1.notes[1]!.remove(); // remove D; E, F pull back

    expect(atBeat2.note?.pitch?.step).toBe('F'); // beat 2 now holds F
  });

  it('treats a chord as a single stop on its onset', () => {
    const voice = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure().voice('1');
    voice.chord(
      [
        { step: 'C', octave: 4 },
        { step: 'E', octave: 4 },
        { step: 'G', octave: 4 },
      ],
      { type: 'quarter' }
    );
    voice.note({ step: 'D', octave: 4, type: 'quarter' });

    const lead = Cursor.at(voice);
    expect(lead.note?.isChordMember).toBe(false);
    expect(lead.note?.pitch?.step).toBe('C'); // the chord's lead, not a member
    expect(lead.next()?.onset).toBe(1); // the chord added no extra stop
    expect(lead.next()?.note?.pitch?.step).toBe('D');
  });

  it('exposes the measure and voice it sits in (for object selection and writing)', () => {
    const { m1 } = twoMeasures();
    const cursor = Cursor.at(m1.voice('1'));

    expect(cursor.measure).toBe(m1);
    expect(cursor.voice.id).toBe('1');
  });
});
