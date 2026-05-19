import { describe, expect, test } from 'bun:test';

import { normalize } from './normalize';
import { Document } from './document';
import { durations as d, element } from './testing';

// normalize() consumes the xml-js root element, not a string. `element` is the
// builder's root-returning entry point, so these tests exercise normalize in
// isolation from mdom.api while still describing music through the builder.

describe('normalize', () => {
  test('returns a Document', () => {
    const doc = normalize(element.partwise((s) => s.part('Music', (p) => p.measure())));

    expect(doc).toBeInstanceOf(Document);
  });

  // spec(mdom.hierarchy): both flavors normalize into one timewise hierarchy so
  // callers never branch on score-partwise vs score-timewise.
  describe('flavor transposition', () => {
    test.each(['partwise', 'timewise'] as const)(
      '%s transposes into the same Document -> Measure -> Part -> Stave -> Voice -> Entry tree',
      (flavor) => {
        const doc = normalize(
          element.flavored(flavor, (s) => {
            s.part('A', (p) => {
              p.measure((m) => m.note('C4'));
              p.measure((m) => m.note('D4'));
            });
            s.part('B', (p) => {
              p.measure((m) => m.note('E4'));
              p.measure((m) => m.note('F4'));
            });
          })
        );

        expect(doc.measures()).toHaveLength(2);
        // A Measure is a timewise slice: each measure holds part A then part B.
        const firstNote = (measureIndex: number, partIndex: number) =>
          doc.at({ measureIndex, partIndex, staveIndex: 0, voiceIndex: 0, entryIndex: 0 })!.notes[0]!.pitch.name;
        expect(firstNote(0, 0)).toBe('C4');
        expect(firstNote(0, 1)).toBe('E4');
        expect(firstNote(1, 0)).toBe('D4');
        expect(firstNote(1, 1)).toBe('F4');
      }
    );

    // spec(mdom.hierarchy): the part-list fixes part order; a part with no
    // notes in a slice still occupies its index as an empty Part.
    test('a part absent from a later measure still occupies its index', () => {
      const doc = normalize(
        element.partwise((s) => {
          s.part('Long', (p) => {
            p.measure((m) => m.note('C4'));
            p.measure((m) => m.note('D4'));
          });
          s.part('Short', (p) => {
            p.measure((m) => m.note('E4'));
          });
        })
      );

      expect(doc.measures()).toHaveLength(2);
      const second = doc.measures()[1]!;
      expect(second.parts()).toHaveLength(2);
      expect(second.at({ partIndex: 0, staveIndex: 0, voiceIndex: 0, entryIndex: 0 })!.notes[0]!.pitch.name).toBe('D4');
      // "Short" has no notes in measure 2 — still a Part, just empty.
      expect(second.parts()[1]!.staves()).toHaveLength(0);
    });

    // spec(mdom.hierarchy): part order comes from <part-list>; with no
    // score-part entries there are no Parts even though notes exist. No
    // s.part() calls leaves <part-list> empty; a raw <part> still carries notes.
    test('an empty part-list yields measures with no parts', () => {
      const doc = normalize(
        element.partwise((s) => s.raw('<part id="P1"><measure number="1"><note><rest/></note></measure></part>'))
      );

      expect(doc.measures()).toHaveLength(1);
      expect(doc.measures()[0]!.parts()).toHaveLength(0);
    });
  });

  // spec(mdom.hierarchy): Staves are ordered by staff number; a stave's voices
  // by first appearance in the note stream.
  describe('stave and voice ordering', () => {
    test('staves are sorted by <staff> number regardless of note order', () => {
      const doc = normalize(
        element.partwise((s) =>
          s.part('Piano', (p) =>
            p.measure((m) => {
              m.note('C2', d.quarter, (n) => n.staff(2));
              m.note('C5', d.quarter, (n) => n.staff(1));
            })
          )
        )
      );

      const staves = doc.at({ measureIndex: 0, partIndex: 0 })!.staves();
      expect(staves).toHaveLength(2);
      // staff 1 sorts first even though its note appeared second.
      expect(staves[0]!.at({ voiceIndex: 0, entryIndex: 0 })!.notes[0]!.pitch.name).toBe('C5');
      expect(staves[1]!.at({ voiceIndex: 0, entryIndex: 0 })!.notes[0]!.pitch.name).toBe('C2');
    });

    test('a note without <staff> defaults to staff 1', () => {
      const doc = normalize(element.partwise((s) => s.part('M', (p) => p.measure((m) => m.note('C4')))));

      expect(doc.at({ measureIndex: 0, partIndex: 0 })!.staves()).toHaveLength(1);
    });

    test('voices are ordered by first appearance, not by voice number', () => {
      const doc = normalize(
        element.partwise((s) =>
          s.part('M', (p) =>
            p.measure((m) => {
              m.note('C4', d.quarter, (n) => n.voice(3));
              m.note('E4', d.quarter, (n) => n.voice(1));
              m.note('D4', d.quarter, (n) => n.voice(3));
            })
          )
        )
      );

      const voices = doc.at({ measureIndex: 0, partIndex: 0, staveIndex: 0 })!.voices();
      expect(voices).toHaveLength(2);
      // voice "3" appeared first, so it is the first Voice.
      expect(voices[0]!.entries().map((e) => e.notes[0]!.pitch.name)).toEqual(['C4', 'D4']);
      expect(voices[1]!.entries().map((e) => e.notes[0]!.pitch.name)).toEqual(['E4']);
    });

    test('a note without <voice> defaults to voice 1', () => {
      const doc = normalize(
        element.partwise((s) =>
          s.part('M', (p) =>
            p.measure((m) => {
              m.note('C4');
              m.note('D4');
            })
          )
        )
      );

      const voices = doc.at({ measureIndex: 0, partIndex: 0, staveIndex: 0 })!.voices();
      expect(voices).toHaveLength(1);
      expect(voices[0]!.entries()).toHaveLength(2);
    });
  });

  // spec(mdom.entries): a chord is one Entry with multiple Notes — the per-note
  // <chord/> flag folds into the preceding entry.
  describe('chord folding', () => {
    test('a 3-note chord becomes one Entry of kind "chord" with three notes', () => {
      const doc = normalize(element.partwise((s) => s.part('M', (p) => p.measure((m) => m.chord(['C4', 'E4', 'G4'])))));

      const entries = doc.at({ measureIndex: 0, partIndex: 0, staveIndex: 0, voiceIndex: 0 })!.entries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.kind).toBe('chord');
      expect(entries[0]!.notes.map((n) => n.pitch.name)).toEqual(['C4', 'E4', 'G4']);
    });

    test('a leading <chord/> flag with no preceding entry is a plain note', () => {
      // drafts is empty, so the fold guard (drafts.length > 0) is false and the
      // chord note starts a fresh entry instead of folding. raw() injects the
      // bare <chord/> flag the builder's chord() never emits on a first note.
      const doc = normalize(
        element.partwise((s) => s.part('M', (p) => p.measure((m) => m.note('C4', 1, (n) => n.raw('<chord/>')))))
      );

      const entries = doc.at({ measureIndex: 0, partIndex: 0, staveIndex: 0, voiceIndex: 0 })!.entries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.kind).toBe('note');
      expect(entries[0]!.notes.map((n) => n.pitch.name)).toEqual(['C4']);
    });
  });

  // spec(mdom.entries): note.pitch is resolved (step/octave/alter + derived
  // midi/name); a rest yields no Note.
  describe('entry parsing', () => {
    test('a rest is an Entry of kind "rest" with no notes', () => {
      const doc = normalize(
        element.partwise((s) =>
          s.part('M', (p) =>
            p.measure((m) => {
              m.note('C4');
              m.rest();
            })
          )
        )
      );

      const entries = doc.at({ measureIndex: 0, partIndex: 0, staveIndex: 0, voiceIndex: 0 })!.entries();
      expect(entries.map((e) => e.kind)).toEqual(['note', 'rest']);
      expect(entries[1]!.notes).toHaveLength(0);
    });

    test('alter resolves into midi and accidental name', () => {
      const doc = normalize(
        element.partwise((s) =>
          s.part('M', (p) =>
            p.measure((m) => {
              m.note('C#4');
              m.note('Bb3');
            })
          )
        )
      );

      const entries = doc.at({ measureIndex: 0, partIndex: 0, staveIndex: 0, voiceIndex: 0 })!.entries();
      expect(entries[0]!.notes[0]!.pitch).toMatchObject({ name: 'C#4', midi: 61, alter: 1 });
      expect(entries[1]!.notes[0]!.pitch).toMatchObject({ name: 'Bb3', midi: 58, alter: -1 });
    });

    test('a <pitch> missing step/octave/alter falls back to C4 natural', () => {
      // The builder always emits step+octave; raw() injects the degenerate
      // <pitch/> that exercises parseNote's C/4/0 fallbacks.
      const doc = normalize(
        element.partwise((s) => s.part('M', (p) => p.measure((m) => m.raw('<note><pitch/></note>'))))
      );

      const note = doc.at({ measureIndex: 0, partIndex: 0, staveIndex: 0, voiceIndex: 0, entryIndex: 0 })!.notes[0]!;
      expect(note.pitch).toMatchObject({ step: 'C', octave: 4, alter: 0, name: 'C4', midi: 60 });
    });
  });
});
