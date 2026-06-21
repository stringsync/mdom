import { describe, expect, it } from 'bun:test';
import { groupChords } from './chord';
import { MDOMParser } from './m-dom-parser';

// divisions=4. Voice 1: a C-major triad stacked at one onset via <chord/> (lead
// C, then E and G carrying <chord/>), followed by a standalone D. The grouping
// query collapses the <chord/> run back into a single sounding Chord.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

describe('Chord grouping', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score!.part('P1')!.measure('1')!;

  it('collapses a <chord/> run into one Chord with the lead carrying the onset', () => {
    // measure.chords() pulls the stacked notes into one sounding group.
    const triad = measure.chords()[0]!;
    expect(triad.lead.pitch?.step).toBe('C');
    expect(triad.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(triad.measureBeat()).toBe(0); // onset of the lead note
  });

  it('keeps a standalone note as its own 1-member Chord', () => {
    // The D after the triad starts a fresh group of one.
    const chords = measure.chords();
    expect(chords).toHaveLength(2);
    const standalone = chords[1]!;
    expect(standalone.notes.map((note) => note.pitch?.step)).toEqual(['D']);
    expect(standalone.lead.pitch?.step).toBe('D');
  });

  it('groupChords(notes) collapses the same way as the measure query', () => {
    // The exported function is the grouping primitive measure.chords() delegates to.
    const chords = groupChords(measure.notes);
    expect(chords.map((chord) => chord.notes.map((note) => note.pitch?.step))).toEqual([['C', 'E', 'G'], ['D']]);
    expect(chords[0]!.lead.pitch?.step).toBe('C');
  });
});
