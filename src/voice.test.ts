import { describe, expect, it } from 'bun:test';
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
  const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;

  it('notes reads only the notes carrying this <voice>', () => {
    // `notes` is the live slice for one voice, ignoring the interleaved other one.
    const firstVoice = measure.getOrCreateVoice('1');
    const secondVoice = measure.getOrCreateVoice('2');
    expect(firstVoice.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G', 'D']);
    expect(secondVoice.notes.map((note) => note.pitch?.step)).toEqual(['C', 'G']);
  });

  it('chords() groups this voice’s <chord/> stacks into one Chord', () => {
    // The triad's three notes collapse into a single Chord; the lone D stands alone.
    const chords = measure.getOrCreateVoice('1').chords;
    expect(chords.map((chord) => chord.notes.length)).toEqual([3, 1]);
    expect(chords[0]!.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(chords[0]!.lead.pitch?.step).toBe('C');
  });
});
