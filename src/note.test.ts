import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';

// One pitched note (with an alter) and one rest, so every getter is exercised.
const SAMPLE = `<score-partwise>
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note>
        <pitch>
          <step>C</step>
          <alter>1</alter>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <rest/>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe('Note', () => {
  const parser = new MDOMParser();
  const notes = parser.parseFromString(SAMPLE).score?.part('P1')?.measure('1')?.notes ?? [];

  it('lists every note in the measure', () => {
    expect(notes.length).toBe(2);
  });

  it('reads a pitched note', () => {
    const note = notes[0];
    expect(note?.isRest).toBe(false);
    expect(note?.pitch?.step).toBe('C');
    expect(note?.pitch?.alter).toBe(1);
    expect(note?.pitch?.octave).toBe(4);
    expect(note?.duration).toBe(4);
    expect(note?.type).toBe('quarter');
  });

  it('reads a rest as a note with no pitch', () => {
    const rest = notes[1];
    expect(rest?.isRest).toBe(true);
    expect(rest?.pitch).toBeNull();
  });
});
