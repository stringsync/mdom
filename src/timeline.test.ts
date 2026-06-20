import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';

// 4/4, divisions=4. Voice 1: a C-major triad (one onset, stacked via <chord/>)
// then a D. Voice 2 (after <backup>): two quarters. The voices interleave in the
// markup; the grouping queries pull them apart.
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

describe('timeline & grouping', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!.measure('1')!;

  it('groups notes by voice', () => {
    const voices = measure.voices();
    expect(voices.map((voice) => voice.id)).toEqual(['1', '2']);
    expect(voices[1]!.notes.map((note) => note.pitch?.step)).toEqual(['C', 'G']);
  });

  it('collapses a <chord/> run into one Chord and reads its onset', () => {
    const triad = measure.chords()[0]!;
    expect(triad.lead.pitch?.step).toBe('C');
    expect(triad.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(triad.measureBeat()).toBe(0);
  });

  it('reads duration in beats and chord membership off the note', () => {
    const [firstNote, secondNote] = measure.notes;
    expect(firstNote!.beats).toBe(1); // duration 4 / divisions 4
    expect(firstNote!.isChordMember).toBe(false);
    expect(secondNote!.isChordMember).toBe(true);
    expect(firstNote!.voice).toBe('1');
  });
});
