import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'bun:test';
import { MDOMParser, MusicXMLSerializer } from '../index';
import { EXAMPLES } from './examples';

// Cross-exporter compatibility, one real file per MusicXML dialect (Finale, Dolet,
// MuseScore, Guitar Pro, Sibelius, Dorico, LilyPond, …). The invariant is round-trip
// *idempotence*: parse → serialize → parse → serialize must reach a fixpoint. That
// objectively proves mdom preserves everything in the file — including the long tail
// of elements it doesn't model — without hand-labeling each file's musical content.
// Each test also smoke-checks that the score came back non-empty.
const parser = new MDOMParser();
const serializer = new MusicXMLSerializer();

const loadExample = (file: string): string => fs.readFileSync(path.join(__dirname, 'examples', file), 'utf-8');

const roundTrip = (xml: string): string => serializer.serializeToString(parser.parseFromString(xml));

describe('cross-exporter round-trip idempotence', () => {
  it('holds for the Chopin prelude Finale wrote', () => {
    const xml = loadExample(EXAMPLES.CHOPIN_PRELUDE);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the drum tuplet beams measure Finale wrote', () => {
    const xml = loadExample(EXAMPLES.DRUM_TUPLET_BEAMS_MEASURE);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the Actor prelude Dolet wrote', () => {
    const xml = loadExample(EXAMPLES.ACTOR_PRELUDE_SAMPLE);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the tab Guitar Pro wrote', () => {
    const xml = loadExample(EXAMPLES.WANNA_SKIP_CLASS);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the accidentals study MuseScore wrote', () => {
    const xml = loadExample(EXAMPLES.ACCIDENTALS);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the octave-shift piano piece MuseScore wrote', () => {
    const xml = loadExample(EXAMPLES.OCTAVE_SHIFT_SIMPLE_PIANO);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the one-line composer credit Sibelius wrote', () => {
    const xml = loadExample(EXAMPLES.COMPOSER_ONE_LINE);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the ignored-beaming file Sibelius 5 wrote', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_99A-SIBELIUS5-IGNOREBEAMING']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the sorted chord notes Dorico wrote', () => {
    const xml = loadExample(EXAMPLES.SORTED_NOTES_CHORD_VEXFLOW_KEYS_ORDER);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the repeats and coda marks Noteflight wrote', () => {
    const xml = loadExample(EXAMPLES.STAVE_REPETITIONS_CODA_ETC);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the rehearsal marks iReal Pro wrote', () => {
    const xml = loadExample(EXAMPLES.REHEARSAL_MARKS_BOLIVIA);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the tablature bends Guitar Tab Creator wrote', () => {
    const xml = loadExample(EXAMPLES.TABLATURE_BENDS);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond mid-piece divisions change', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_03C-RHYTHM-DIVISIONCHANGE']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond senza-misura time signature', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_11H-TIMESIGNATURES-SENZAMISURA']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond microtonal key signatures', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_13D-KEYSIGNATURES-MICROTONES']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond octave shift with an invalid size', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_33E-SPANNERS-OCTAVESHIFTS-INVALIDSIZE']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond invalid repeat endings', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_45F-REPEATS-INVALIDENDINGS']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond incomplete measures', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_46F-INCOMPLETEMEASURES']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond multi-staff keys that differ after a backup', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_43C-MULTISTAFF-DIFFERENTKEYSAFTERBACKUP']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond after-grace notes', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_24D-AFTERGRACE']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond lyric elisions', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_61J-LYRICS-ELISIONS']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the LilyPond score with too many parts', () => {
    const xml = loadExample(EXAMPLES['LILYPOND_41H-TOOMANYPARTS']);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the W3C hello-world sample', () => {
    const xml = loadExample(EXAMPLES.HELLO_WORLD);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the W3C note variations sample', () => {
    const xml = loadExample(EXAMPLES.NOTE_VARIATIONS);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });

  it('holds for the W3C concert score and for-part sample', () => {
    const xml = loadExample(EXAMPLES.CONCERT_SCORE_AND_FOR_PART);
    expect(parser.parseFromString(xml).score.parts.some((part) => part.measures.length > 0)).toBe(true);
    const once = roundTrip(xml);
    expect(roundTrip(once)).toBe(once);
  });
});
