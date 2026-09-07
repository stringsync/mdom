import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// Chord members with no <voice> of their own: they stack on the note before them
// and belong to its voice. Bucketing them into '1' invented a voice and, with no
// lead note between them, collapsed both into one bogus chord at beat 0.
const IMPLICIT_VOICE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note>
      <note><chord/><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note>
      <note><chord/><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('Voice reader — chord members inherit their lead’s voice', () => {
  const measure = new MDOMParser().parseFromString(IMPLICIT_VOICE).score.getPart('P1')!.getMeasure('1')!;

  it('does not invent a voice 1 for the <voice>-less chord members', () => {
    expect(measure.voices.map((voice) => voice.id)).toEqual(['2']);
  });

  it('keeps the two stacks separate, each at its lead’s onset', () => {
    const chords = measure.getOrCreateVoice('2').chords;
    expect(chords.map((chord) => chord.notes.map((note) => note.pitch?.step))).toEqual([
      ['C', 'G'],
      ['D', 'A'],
    ]);
    expect(chords.map((chord) => chord.measureBeat)).toEqual([0, 1]);
  });
});
