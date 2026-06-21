import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import type { Note } from './note';

function noteWith(inner: string): Note {
  return new MDOMParser()
    .parseFromString(
      `<score-partwise><part id="P1"><measure number="1">
       <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>${inner}</note>
     </measure></part></score-partwise>`
    )
    .score.getPart('P1')!
    .getMeasure('1')!.notes[0]!;
}

describe('Lyric', () => {
  it('reads verse, syllabic, and syllable through Note.lyrics', () => {
    const [lyric] = noteWith(`<lyric number="2"><syllabic>begin</syllabic><text>love</text></lyric>`).lyrics;
    expect(lyric!.verse).toBe('2');
    expect(lyric!.syllabic).toBe('begin');
    expect(lyric!.syllable).toBe('love');
  });

  it('joins elided runs into one syllable', () => {
    const [lyric] = noteWith(`<lyric><text>look</text><elision/><text>it</text></lyric>`).lyrics;
    expect(lyric!.syllable).toBe('lookit');
  });

  it('exposes every verse attached to the note', () => {
    const note = noteWith(`<lyric number="1"><text>one</text></lyric><lyric number="2"><text>two</text></lyric>`);
    expect(note.lyrics.map((lyric) => lyric.verse)).toEqual(['1', '2']);
  });

  it('defaults verse to 1 and syllabic to null when omitted', () => {
    const [lyric] = noteWith(`<lyric><text>la</text></lyric>`).lyrics;
    expect(lyric!.verse).toBe('1');
    expect(lyric!.syllabic).toBeNull();
    expect(lyric!.extend).toBe(false);
  });
});
