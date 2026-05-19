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

const MINIMAL_PARTWISE = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1"><measure number="1"/></part>
</score-partwise>`;

// spec(mdom.api)
describe('mdom', () => {
  test('parse returns a Document for well-formed MusicXML', () => {
    const document = mdom.parse(MINIMAL_PARTWISE);

    expect(document).toBeInstanceOf(Document);
  });

  test('parse normalizes score-timewise the same way', () => {
    const document = mdom.parse('<score-timewise><part-list/><measure number="1"/></score-timewise>');

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

// spec(mdom.navigation): traversal is bidirectional and possible from any node.
describe('mdom.navigation', () => {
  function tree() {
    const mod = new Mod();
    const entry = new Entry([mod]);
    const voice = new Voice([entry]);
    const stave = new Stave([voice]);
    const part = new Part([stave]);
    const measure = new Measure([part]);
    const document = new Document([measure]);
    return { document, measure, part, stave, voice, entry, mod };
  }

  test('parent() returns the immediate parent', () => {
    const { document, measure, part, stave, voice, entry, mod } = tree();

    expect(measure.parent()).toBe(document);
    expect(part.parent()).toBe(measure);
    expect(stave.parent()).toBe(part);
    expect(voice.parent()).toBe(stave);
    expect(entry.parent()).toBe(voice);
    expect(mod.parent()).toBe(entry);
  });

  test('parent() chains all the way up to the Document', () => {
    const { document, mod } = tree();

    expect(mod.parent().parent().parent().parent().parent().parent()).toBe(document);
  });

  test('document() reaches the root from any node', () => {
    const { document, measure, mod } = tree();

    expect(document.document()).toBe(document);
    expect(measure.document()).toBe(document);
    expect(mod.document()).toBe(document);
  });

  test('key() is this node’s address, each extending its ancestor', () => {
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

  test('key() reflects sibling position', () => {
    const document = new Document([new Measure([]), new Measure([new Part([]), new Part([])])]);
    const secondMeasure = document.measures()[1]!;
    const secondPart = secondMeasure.parts()[1]!;

    expect(secondMeasure.key()).toEqual({ measureIndex: 1 });
    expect(secondPart.key()).toEqual({ measureIndex: 1, partIndex: 1 });
    expect(secondPart.document()).toBe(document);
  });
});
