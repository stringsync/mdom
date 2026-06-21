import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './xml';
import { Accidental } from './accidental';
import type { Note } from './note';

function noteWith(inner: string): Note {
  return new MDOMParser()
    .parseFromString(
      `<score-partwise><part id="P1"><measure number="1">
       <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration>${inner}</note>
     </measure></part></score-partwise>`
    )
    .score!.part('P1')!
    .measure('1')!.notes[0]!;
}

describe('Accidental', () => {
  it('reads the glyph and its parenthesization through Note.accidental', () => {
    const note = noteWith(`<accidental parentheses="yes">sharp</accidental>`);
    expect(note.accidental!.value).toBe('sharp');
    expect(note.accidental!.parentheses).toBe(true);
    expect(note.accidental!.cautionary).toBe(false);
    expect(note.accidental!.bracket).toBe(false);
  });

  it('is null when the note prints no accidental', () => {
    expect(noteWith('').accidental).toBeNull();
  });

  it('throws a located error on a valueless accidental', () => {
    expect(() => new Accidental().value).toThrow('value of <accidental>');
  });
});
