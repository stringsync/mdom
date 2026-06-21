import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Note } from './note';
import type { Measure } from './measure';

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
  const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;

  it('groups notes by voice', () => {
    const voices = measure.voices;
    expect(voices.map((voice) => voice.id)).toEqual(['1', '2']);
    expect(voices[1]!.notes.map((note) => note.pitch?.step)).toEqual(['C', 'G']);
  });

  it('collapses a <chord/> run into one Chord and reads its onset', () => {
    const triad = measure.chords[0]!;
    expect(triad.lead.pitch?.step).toBe('C');
    expect(triad.notes.map((note) => note.pitch?.step)).toEqual(['C', 'E', 'G']);
    expect(triad.measureBeat).toBe(0);
  });

  it('reads duration in beats and chord membership off the note', () => {
    const [firstNote, secondNote] = measure.notes;
    expect(firstNote!.beats).toBe(1); // duration 4 / divisions 4
    expect(firstNote!.isChordMember).toBe(false);
    expect(secondNote!.isChordMember).toBe(true);
    expect(firstNote!.voice).toBe('1');
  });
});

// Minimal hand-authored markup parsed into a measure — this exercises the READ
// path: folding <backup>/<forward>/<chord/>/<grace/> already present in the input,
// in shapes the writer wouldn't necessarily emit. (The write path that *generates*
// these elements via the edit API is covered in e2e/crud.test.ts.) divisions=4.
function measureFrom(body: string): Measure {
  const xml = `<score-partwise><part id="P1"><measure number="1"><attributes><divisions>4</divisions></attributes>${body}</measure></part></score-partwise>`;
  return new MDOMParser().parseFromString(xml).score.getPart('P1')!.getMeasure('1')!;
}

function noteXml(step: string, octave: number, duration: number | null, lead = ''): string {
  const dur = duration == null ? '' : `<duration>${duration}</duration>`;
  return `<note>${lead}<pitch><step>${step}</step><octave>${octave}</octave></pitch>${dur}</note>`;
}

const beatsOf = (measure: Measure): (number | null)[] => measure.notes.map((eachNote) => eachNote.measureBeat);

describe('onset fold — backup/forward/chord/grace', () => {
  it('advances the cursor by the duration of each note', () => {
    const measure = measureFrom(`${noteXml('C', 4, 4)}${noteXml('D', 4, 8)}${noteXml('E', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 1, 3]); // quarter, half, quarter
  });

  it('stacks <chord/> notes on the prior onset, adding no time', () => {
    const measure = measureFrom(
      `${noteXml('C', 4, 4)}${noteXml('E', 4, 4, '<chord/>')}${noteXml('G', 4, 4, '<chord/>')}${noteXml('D', 4, 4)}`
    );
    expect(beatsOf(measure)).toEqual([0, 0, 0, 1]);
  });

  it('sits a <grace/> note at the cursor, stealing no time', () => {
    const measure = measureFrom(`${noteXml('C', 5, null, '<grace/>')}${noteXml('D', 4, 4)}${noteXml('E', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 0, 1]);
  });

  it('rewinds the cursor on <backup> so a second voice starts over', () => {
    const measure = measureFrom(
      `${noteXml('C', 4, 8)}${noteXml('D', 4, 8)}<backup><duration>16</duration></backup>` +
        `${noteXml('C', 3, 4)}${noteXml('D', 3, 4)}${noteXml('E', 3, 4)}${noteXml('F', 3, 4)}`
    );
    expect(beatsOf(measure)).toEqual([0, 2, 0, 1, 2, 3]);
  });

  it('opens a gap on <forward>', () => {
    const measure = measureFrom(`${noteXml('C', 4, 4)}<forward><duration>8</duration></forward>${noteXml('D', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 3]);
  });

  it('lets a zero-duration element pass without moving the cursor', () => {
    const direction = '<direction><direction-type><words>cresc.</words></direction-type></direction>';
    const measure = measureFrom(`${noteXml('C', 4, 4)}${direction}${noteXml('D', 4, 4)}`);
    expect(beatsOf(measure)).toEqual([0, 1]);
  });

  it('returns null for a note outside any measure', () => {
    expect(new Note().measureBeat).toBeNull();
  });
});
