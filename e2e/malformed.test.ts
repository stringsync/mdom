import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'bun:test';
import { MDOMParser, MusicXMLSerializer } from '../index';
import { MALFORMED } from './examples';

// Hand-built broken input: what mdom must throw on, and what it must survive.
const parser = new MDOMParser();
const serializer = new MusicXMLSerializer();

const loadExample = (file: string): string => fs.readFileSync(path.join(__dirname, 'examples', file), 'utf-8');

const roundTrip = (xml: string): string => serializer.serializeToString(parser.parseFromString(xml));

describe('malformed input', () => {
  it('throws on input that is not well-formed XML', () => {
    expect(() => parser.parseFromString(loadExample(MALFORMED.INVALID_ROOT))).toThrow();
  });

  it('parses valid-but-empty MusicXML to a score with no parts', () => {
    const score = parser.parseFromString(loadExample(MALFORMED.MOSTLY_INVALID)).score;
    expect(score.parts.length).toBe(0);
  });

  it('tolerates non-numeric duration/divisions content and still round-trips', () => {
    const once = roundTrip(loadExample(MALFORMED.PARTIALLY_INVALID));
    expect(roundTrip(once)).toBe(once);
  });
});
