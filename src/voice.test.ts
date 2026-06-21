import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';

// 4/4, divisions=4. Voice 1: a C-major triad (one onset, stacked via <chord/>)
// then a D. Voice 2 (after <backup>): two quarters. The two voices interleave in
// the markup; the Voice reader pulls each one out and groups its chord stacks.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note>
    </measure>
  </part>
</score-partwise>`;

describe('Voice reader — filtering and grouping', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!.measure('1')!;

  it('notes reads only the notes carrying this <voice>', () => {
    // `notes` is the live slice for one voice, ignoring the interleaved other one.
    const firstVoice = measure.voice('1');
    const secondVoice = measure.voice('2');
    expect(firstVoice.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G', 'D']);
    expect(secondVoice.notes.map((note) => note.pitch?.step)).toEqual(['C', 'G']);
  });

  it('chords() groups this voice’s <chord/> stacks into one Chord', () => {
    // The triad's three notes collapse into a single Chord; the lone D stands alone.
    const chords = measure.voice('1').chords();
    expect(chords.map((chord) => chord.notes.length)).toEqual([3, 1]);
    expect(chords[0]!.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(chords[0]!.lead.pitch?.step).toBe('C');
  });
});

// Intent goes in through the Voice writer; the read layer (beats / measureBeat /
// staff / voice) confirms it. The caller never writes <divisions>, <duration>,
// <backup>, <forward>, <voice>, or <staff> — so the assertions read those back
// in divisions-independent musical terms only.
describe('Voice writer — intent in, structure out', () => {
  it('note() appends at the voice cursor, each following the last', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.voice('1');
    voice.note({ step: 'C', octave: 4, type: 'quarter' });
    voice.note({ step: 'D', octave: 4, type: 'quarter' });

    expect(measure.notes.map((note) => note.pitch?.step)).toEqual(['C', 'D']);
    expect(measure.notes.map((note) => note.measureBeat())).toEqual([0, 1]);
  });

  it('honors an explicit onset, filling the gap with <forward>', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.voice('1');
    voice.note({ step: 'C', octave: 4, type: 'quarter' }); // beat 0
    voice.note({ step: 'G', octave: 4, type: 'quarter', onset: 2 }); // skip beat 1

    expect(measure.notes.map((note) => note.measureBeat())).toEqual([0, 2]);
  });

  it('starts a second voice on staff 2 with a <backup>, resetting its onsets', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1', name: 'Piano' }).addMeasure();

    const rightHand = measure.voice('1', { staff: '1' });
    rightHand.note({ step: 'C', octave: 4, type: 'quarter' });
    rightHand.note({ step: 'D', octave: 4, type: 'quarter' });

    const leftHand = measure.voice('2', { staff: '2' });
    leftHand.note({ step: 'C', octave: 3, type: 'half' });

    // The left hand jumps back to beat 0 (mdom inserted the <backup> itself).
    expect(measure.notes.map((note) => note.measureBeat())).toEqual([0, 1, 0]);
    expect(measure.notes.map((note) => note.staff)).toEqual(['1', '1', '2']);
    expect(measure.notes.map((note) => note.voice)).toEqual(['1', '1', '2']);
  });

  it('rest() and chord() write rests and stacks the read layer recovers', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.voice('1');
    voice.rest({ type: 'quarter' });
    const triad = voice.chord(
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
    expect(triad.measureBeat()).toBe(1); // the chord follows the quarter rest
  });

  it('computes beats from musical type + dots, owning <divisions>', () => {
    const measure = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure();

    const voice = measure.voice('1');
    const dottedQuarter = voice.note({ step: 'C', octave: 4, type: 'quarter', dots: 1 });
    const eighth = voice.note({ step: 'D', octave: 4, type: 'eighth' });

    expect(dottedQuarter.beats).toBe(1.5); // no divisions math by the caller
    expect(eighth.beats).toBe(0.5);
    expect(eighth.measureBeat()).toBe(1.5); // follows the dotted quarter
  });

  it('throws on a duration its fixed <divisions> cannot represent', () => {
    const voice = MDocument.empty().score!.addPart({ id: 'P1' }).addMeasure().voice('1');
    // A quadruple-dotted 128th lands on a fractional <duration>; mdom refuses
    // rather than emit invalid MusicXML.
    expect(() => voice.note({ step: 'C', octave: 4, type: '128th', dots: 4 })).toThrow();
  });
});
