import { describe, expect, test } from 'bun:test';

import { InvalidMusicXmlError, XmlParseError } from './errors';
import { mdom } from './mdom';
import { Document } from './nodes/document';

const MINIMAL_PARTWISE = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1"><measure number="1"/></part>
</score-partwise>`;

describe('mdom.api', () => {
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
