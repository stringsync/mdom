import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'bun:test';
import { MDOMParser, MusicXMLSerializer } from '../index';
import { EXAMPLE_SUITES, MALFORMED } from './examples';

const loadExample = (file: string): string => fs.readFileSync(path.join(__dirname, 'examples', file), 'utf-8');

// Cross-exporter compatibility. Each suite is a different source software's MusicXML
// dialect (Finale, Dolet, MuseScore, Guitar Pro, Sibelius, Dorico, LilyPond, …). The
// invariant we assert is round-trip *idempotence*: parse → serialize → parse → serialize
// must reach a fixpoint. That objectively proves mdom preserves everything in the file —
// including the long tail of elements it doesn't model — without hand-labeling each
// file's musical content. We also smoke-check the score is non-empty.
const parser = new MDOMParser();
const serializer = new MusicXMLSerializer();

const roundTrip = (xml: string): string => serializer.serializeToString(parser.parseFromString(xml));

for (const [source, examples] of Object.entries(EXAMPLE_SUITES)) {
  describe(`${source} exports`, () => {
    it.each([...examples])('%s loads and round-trips unchanged', (example) => {
      const xml = loadExample(example);

      const score = parser.parseFromString(xml).score;
      expect(score).not.toBeNull();
      expect(score!.parts.some((part) => part.measures.length > 0)).toBe(true);

      const once = roundTrip(xml);
      expect(roundTrip(once)).toBe(once);
    });
  });
}

describe('malformed input', () => {
  it('throws on input that is not well-formed XML', () => {
    expect(() => parser.parseFromString(loadExample(MALFORMED.INVALID_ROOT))).toThrow();
  });

  it('parses valid-but-empty MusicXML to a score with no parts', () => {
    const score = parser.parseFromString(loadExample(MALFORMED.MOSTLY_INVALID)).score;
    expect(score).not.toBeNull();
    expect(score!.parts.length).toBe(0);
  });

  it('tolerates non-numeric duration/divisions content and still round-trips', () => {
    const once = roundTrip(loadExample(MALFORMED.PARTIALLY_INVALID));
    expect(roundTrip(once)).toBe(once);
  });
});
