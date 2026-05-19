import { describe, expect, test } from 'bun:test';

import { InvalidMusicXmlError, XmlParseError } from './errors';
import { mdom } from './mdom';
import { Document } from './nodes/document';
import { Entry } from './nodes/entry';
import { Measure } from './nodes/measure';
import { Mod } from './nodes/mod';
import { Part } from './nodes/part';
import { Stave } from './nodes/stave';
import { Voice } from './nodes/voice';
import { durations as d, score } from './testing';

describe('mdom.api', () => {
  test('parse returns a Document for well-formed MusicXML', () => {
    const document = mdom.parse(score.partwise((s) => s.part('Music', (p) => p.measure())));

    expect(document).toBeInstanceOf(Document);
  });

  test('parse normalizes score-timewise the same way', () => {
    const document = mdom.parse(
      score.timewise((s) => {
        s.part('Music', (p) => p.measure());
      })
    );

    expect(document).toBeInstanceOf(Document);
  });

  test('parse throws an XmlParseError for malformed XML', () => {
    expect(() => mdom.parse('<score-partwise><part></score-partwise>')).toThrow(XmlParseError);
  });

  test('parse throws an InvalidMusicXmlError for non-MusicXML XML', () => {
    expect(() => mdom.parse('<html><body>hi</body></html>')).toThrow(InvalidMusicXmlError);
  });

  test('parse throws an InvalidMusicXmlError for empty input', () => {
    expect(() => mdom.parse('')).toThrow(InvalidMusicXmlError);
  });
});

// spec(mdom.hierarchy): parse normalizes both flavors into one timewise tree:
// Document -> Measure -> Part -> Stave -> Voice -> Entry.
describe('mdom.hierarchy', () => {
  // The same musical description, inlined per flavor, so both mdom.parse
  // normalization paths are exercised from one self-contained fixture.
  test.each(['partwise', 'timewise'] as const)('%s normalizes into the same timewise hierarchy', (flavor) => {
    const xml = score.flavored(flavor, (s) => {
      s.part('Flute', (p) => {
        p.measure((m) => {
          m.note('C4', d.quarter, (n) => n.voice(1));
          m.chord(['E4', 'G4'], d.quarter, (n) => n.voice(1));
          m.rest(d.quarter, (n) => n.voice(1));
        });
      });
      s.part('Piano', (p) => {
        p.measure((m) => {
          m.note('C#3', d.half, (n) => n.voice(1).staff(1));
          m.note('C2', d.half, (n) => n.voice(5).staff(2));
        });
      });
    });
    const document = mdom.parse(xml);

    expect(document.measures()).toHaveLength(1);
    const measure = document.measures()[0]!;
    expect(measure.parts()).toHaveLength(2);

    // spec(mdom.hierarchy): a Part has many Staves; a Stave has many Voices.
    const flute = measure.parts()[0]!;
    expect(flute.staves()).toHaveLength(1);
    const voice = flute.staves()[0]!.voices()[0]!;
    const entries = voice.entries();

    // spec(mdom.entries): kind discriminates; a chord is one Entry with many
    // Notes, a rest an Entry with none.
    expect(entries.map((e) => e.kind)).toEqual(['note', 'chord', 'rest']);
    expect(entries[0]!.notes.map((n) => n.pitch.name)).toEqual(['C4']);
    expect(entries[0]!.notes[0]!.pitch.midi).toBe(60);
    expect(entries[1]!.notes.map((n) => n.pitch.name)).toEqual(['E4', 'G4']);
    expect(entries[2]!.notes).toHaveLength(0);

    // spec(mdom.hierarchy): a Stave is a staff line within a Part — piano's
    // two <staff>s become two Staves.
    const piano = measure.parts()[1]!;
    expect(piano.staves()).toHaveLength(2);
    expect(piano.staves()[0]!.voices()[0]!.entries()[0]!.notes[0]!.pitch.name).toBe('C#3');
    expect(piano.staves()[1]!.voices()[0]!.entries()[0]!.notes[0]!.pitch.name).toBe('C2');
  });
});

// spec(mdom.navigation): traversal is bidirectional and possible from any node.
describe('mdom.navigation', () => {
  function tree() {
    const mod = new Mod();
    const entry = new Entry('rest', [], [mod]);
    const voice = new Voice([entry]);
    const stave = new Stave([voice]);
    const part = new Part([stave]);
    const measure = new Measure([part]);
    const document = new Document([measure]);
    return { document, measure, part, stave, voice, entry, mod };
  }

  test('parent returns the immediate parent', () => {
    const { document, measure, part, stave, voice, entry, mod } = tree();

    expect(measure.parent()).toBe(document);
    expect(part.parent()).toBe(measure);
    expect(stave.parent()).toBe(part);
    expect(voice.parent()).toBe(stave);
    expect(entry.parent()).toBe(voice);
    expect(mod.parent()).toBe(entry);
  });

  test('parent chains all the way up to the Document', () => {
    const { document, mod } = tree();

    expect(mod.parent().parent().parent().parent().parent().parent()).toBe(document);
  });

  test('document reaches the root from any node', () => {
    const { document, measure, mod } = tree();

    expect(document.document()).toBe(document);
    expect(measure.document()).toBe(document);
    expect(mod.document()).toBe(document);
  });

  test('key is this node’s address, each extending its ancestor', () => {
    const { measure, part, stave, voice, entry, mod } = tree();

    expect(measure.key()).toEqual({ measureIndex: 0 });
    expect(part.key()).toEqual({ measureIndex: 0, partIndex: 0 });
    expect(stave.key()).toEqual({ measureIndex: 0, partIndex: 0, staveIndex: 0 });
    expect(voice.key()).toEqual({ measureIndex: 0, partIndex: 0, staveIndex: 0, voiceIndex: 0 });
    expect(entry.key()).toEqual({ measureIndex: 0, partIndex: 0, staveIndex: 0, voiceIndex: 0, entryIndex: 0 });
    expect(mod.key()).toEqual({
      measureIndex: 0,
      partIndex: 0,
      staveIndex: 0,
      voiceIndex: 0,
      entryIndex: 0,
      modIndex: 0,
    });
  });

  test('key reflects sibling position', () => {
    const document = new Document([new Measure([]), new Measure([new Part([]), new Part([])])]);
    const secondMeasure = document.measures()[1]!;
    const secondPart = secondMeasure.parts()[1]!;

    expect(secondMeasure.key()).toEqual({ measureIndex: 1 });
    expect(secondPart.key()).toEqual({ measureIndex: 1, partIndex: 1 });
    expect(secondPart.document()).toBe(document);
  });
});
